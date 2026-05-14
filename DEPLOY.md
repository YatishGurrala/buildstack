# Deployment Guide

Deploy Buildstack to a VPS for production use. This guide covers deploying to a basic Linux VPS (Ubuntu 22.04+).

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Your Domain                          │
│               (api.example.com)                         │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS (Let's Encrypt)
                     ▼
        ┌────────────────────────┐
        │   Nginx Reverse Proxy  │
        │  (Port 80, 443)        │
        └────────────────────────┘
                     │
                     ▼ (HTTP localhost:3000)
        ┌────────────────────────────────┐
        │  Next.js App (Port 3000)       │
        │  (Docker Container)            │
        └────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────────┐
        │ PostgreSQL (core_db +          │
        │ projects_db, schema per app)   │
        │  (Docker Container)            │
        └────────────────────────────────┘
```

## Prerequisites

- **VPS**: Ubuntu 22.04+ with at least 1GB RAM, 20GB storage
- **SSH access**: Ability to SSH into your VPS as root or with sudo
- **Domain**: Optional. You can deploy on VPS IP first and add domain later.
- **Port access**: Ports 80 and 443 open (HTTP/HTTPS)

### Recommended VPS Provider

- **DigitalOcean**: 1GB+ RAM recommended for API + PostgreSQL.

## Step 1: SSH into VPS

```bash
ssh root@your.vps.ip.address
```

Or if using key-pair authentication:

```bash
ssh -i /path/to/key.pem ubuntu@your.vps.ip.address
```

### Optional: One-command VPS Bootstrap

This repo includes a DigitalOcean-friendly bootstrap script:

```bash
chmod +x scripts/ops/bootstrap-do-vps.sh

# IP-only mode (no domain yet)
sudo ./scripts/ops/bootstrap-do-vps.sh https://github.com/your-username/buildstack.git

# Domain mode (later)
sudo ./scripts/ops/bootstrap-do-vps.sh https://github.com/your-username/buildstack.git /opt/buildstack api.example.com
```

It installs Docker/Nginx/Certbot/UFW, deploys containers, runs migrations, and applies the Nginx template from `deploy/nginx/buildstack.conf`. In IP-only mode, it configures HTTP without Certbot.

The bootstrap script now auto-generates secure values for database password, JWT secret, metrics scrape token, and Grafana admin password when `.env` is missing.

## No Domain Yet (IP-Only)

If you do not have a domain yet, deploy with VPS public IP:

1. Set `GOOGLE_CLIENT_ID` in `.env`.
2. Set `CORS_ORIGINS` to your frontend IP/port origin in `.env`.
3. Run API over HTTP at `http://<your-vps-ip>`.
4. Keep Grafana/Prometheus private via SSH tunnels only.
5. Add domain later and rerun bootstrap script in domain mode to enable HTTPS.

## Step 2: Install Docker & Docker Compose

```bash
# Update package manager
apt-get update && apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose plugin
apt-get install -y docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

## Step 3: Install Git & Clone Repository

```bash
apt-get install -y git

# Clone your repository (replace with your repo URL)
cd /opt
git clone https://github.com/your-username/buildstack.git
cd buildstack
```

## Step 4: Set Up Environment Variables

```bash
# Copy example env file
cp .env.example .env
```

Edit `/opt/buildstack/.env` with production values:

```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database URLs (all point to the db service in docker-compose)
POSTGRES_PASSWORD=your-secure-password
CORE_DATABASE_URL=postgresql://postgres:your-secure-password@db:5432/core_db
PROJECTS_DATABASE_URL=postgresql://postgres:your-secure-password@db:5432/projects_db

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Optional admin email/password login.
# Required only if you plan to use POST /api/core/auth/login.
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace-with-strong-password

# JWT Secret (generate: openssl rand -base64 32)
JWT_SECRET=your-secure-jwt-secret-min-32-chars

# Tokens
ACCESS_TOKEN_TTL_MINUTES=15
REFRESH_TOKEN_TTL_DAYS=30

# CORS (your frontend domain)
CORS_ORIGINS=https://app.example.com,https://www.app.example.com

# Machine token for Prometheus scrape
METRICS_SCRAPE_TOKEN=replace-with-a-long-random-token

# Grafana local admin login for self-hosted dashboards
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=replace-with-strong-password

# Log level for production
LOG_LEVEL=warn
```

### Generate Secure JWT Secret

```bash
openssl rand -base64 32
```

### Generate Secure Database Password

```bash
openssl rand -base64 16
```

## Step 5: Verify Docker Compose Configuration

This repo already includes a production-ready `docker-compose.yml`. Confirm these values exist:

1. `db` service uses `postgres:16-alpine`
2. `POSTGRES_PASSWORD` is sourced from env (`${POSTGRES_PASSWORD:-postgres}`)
3. `api` depends on healthy `db`
4. `.env` contains `CORE_DATABASE_URL` and `PROJECTS_DATABASE_URL` pointing to host `db`

Legacy note: `PROJECT1_DATABASE_URL` fallback exists in code for backward compatibility only; use `PROJECTS_DATABASE_URL` for current deployments.

## Step 6: Start Containers

```bash
# From /opt/buildstack directory
docker compose up -d --build

# Check status
docker compose logs -f api

# Verify database created
docker compose exec db psql -U postgres -c "\l"
```

## Step 7: Run Database Migrations

```bash
# Execute production-safe migrations in running container
docker compose exec api npm run prisma:deploy
```

## Step 8: Install & Configure Nginx

```bash
# Install Nginx
apt-get install -y nginx

# Install Certbot for SSL
apt-get install -y certbot python3-certbot-nginx
```

Create Nginx config at `/etc/nginx/sites-available/buildstack`:

```nginx
server {
    listen 80;
    server_name api.example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    # SSL certificates (will be generated by Certbot)
    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

    # SSL best practices
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint (no logging)
    location /api/health {
        access_log off;
        proxy_pass http://localhost:3000;
    }
}
```

You can also use the included template file:

- `deploy/nginx/buildstack.conf`

Enable the config:

```bash
ln -s /etc/nginx/sites-available/buildstack /etc/nginx/sites-enabled/buildstack
rm /etc/nginx/sites-enabled/default

# Test Nginx config
nginx -t

# Start Nginx
systemctl start nginx
systemctl enable nginx
```

## Step 9: Set Up SSL Certificate

```bash
# Generate certificate (replace api.example.com with your domain)
certbot certonly --nginx -d api.example.com

# Certbot will auto-update Nginx config if using --nginx
# For manual setup, see Nginx config above

# Verify certificate
certbot renew --dry-run
```

## Step 10: Verify Deployment

```bash
# Check if API is responding
curl -k https://api.example.com/api/health

# Should return:
# {"ok":true,"service":"buildstack-backend","ts":"2026-04-17T..."}

# Check logs
docker compose logs -f api

# List all containers
docker compose ps
```

## Step 11: Enable Self-Hosted Monitoring (Prometheus + Grafana)

Create a local scrape token file used by Prometheus:

```bash
mkdir -p docker/prometheus/secrets
printf "%s" "$METRICS_SCRAPE_TOKEN" > docker/prometheus/secrets/metrics-scrape-token
chmod 600 docker/prometheus/secrets/metrics-scrape-token
```

Start monitoring stack:

```bash
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

Access via SSH tunnel only (recommended):

```bash
# Grafana
ssh -L 3001:127.0.0.1:3001 root@your.vps.ip.address

# Prometheus
ssh -L 9090:127.0.0.1:9090 root@your.vps.ip.address
```

Then open:

- `http://localhost:3001` (Grafana)
- `http://localhost:9090` (Prometheus)

## Step 12: Set Up Automated Certificate Renewal

Certbot should auto-renew, but verify:

```bash
# Check renewal schedule (should exist)
cat /etc/cron.d/certbot

# Manual test renewal
certbot renew --dry-run
```

## Monitoring & Maintenance

### View Logs

```bash
# API logs
docker compose logs -f api

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Last 100 lines from API
docker compose logs --tail=100 api

# Monitoring stack logs
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml logs --tail=100 prometheus grafana
```

### Database Backup

```bash
# Manual backup using repo script
./scripts/ops/backup-databases.sh /opt/buildstack/backups

# Restore example
./scripts/ops/restore-database.sh core_db /opt/buildstack/backups/core_db_20260418_020001.sql.gz

# Automated daily backup (add to crontab)
crontab -e

# Add this line:
0 2 * * * cd /opt/buildstack && ./scripts/ops/backup-databases.sh /opt/buildstack/backups
```

### Restart Services

```bash
# Restart API only
docker compose restart api

# Restart all services
docker compose restart

# Full restart (nuclear option)
docker compose down
docker compose up -d
```

### Scale Resources

If experiencing memory pressure:

1. **Increase VPS RAM** (usually $2-5/month more)
2. **Optimize database queries** (add indexes)
3. **Add Redis** for caching (optional enhancement)

### Check Resource Usage

```bash
# CPU, memory, disk
docker stats

# Disk space
df -h

# Database size
docker compose exec db psql -U postgres -c "SELECT datname, pg_size_pretty(pg_database_size(datname)) FROM pg_database;"
```

## Troubleshooting

### "Connection refused" to database

```bash
# Check if Postgres container is healthy
docker compose ps

# View logs
docker compose logs db

# Verify database credentials in .env match docker-compose
```

### "Certificate not found" SSL errors

```bash
# Regenerate certificate
certbot delete --cert-name api.example.com
certbot certonly --nginx -d api.example.com
```

### Application crashes after deploy

```bash
# Check build errors
docker compose up api

# See full logs
docker compose logs --tail=200 api

# Rebuild from scratch
docker compose down
docker build --no-cache -t buildstack-api .
docker compose up -d
```

### Nginx 502 Bad Gateway

Means Next.js server is down:

```bash
# Check if API container is running
docker compose ps

# Restart API
docker compose restart api

# Check logs
docker compose logs api
```

### Database migrations failed

```bash
# Run migrations manually
docker compose exec api npm run prisma:deploy

# Check Prisma status
docker compose exec api npx prisma migrate status --schema prisma/core/schema.prisma
```

## Security Checklist

- ✅ HTTPS enabled (SSL/TLS)
- ✅ Strong JWT secret (32+ random characters)
- ✅ Strong database password (16+ random characters)
- ✅ Firewall: only ports 22, 80, 443 open
- ✅ SSH: disable root login, use key-based auth
- ✅ Regular backups of database
- ✅ Monitor logs for suspicious activity
- ✅ Keep Docker images updated: `docker pull postgres:16`
- ✅ Keep OS updated: `apt-get update && apt-get upgrade`

## Scaling Beyond Single VPS

When you outgrow a single server:

1. **Set up managed database** (AWS RDS, DigitalOcean DB, etc.)
2. **Deploy to Kubernetes** (via DigitalOcean App Platform, AWS ECS, etc.)
3. **Add Redis layer** for session/cache (Docker container or managed)
4. **Set up CDN** (CloudFlare, AWS CloudFront)
5. **Use load balancer** (AWS ALB, DigitalOcean Load Balancer)

## Next Steps

1. **Monitor in production** — Set up log aggregation (Sentry, DataDog)
2. **Add observability** — Instrument performance metrics
3. **Plan backups** — Automated daily database dumps to S3
4. **Performance tune** — Profile slow endpoints, optimize queries
5. **Security audit** — Regular vulnerability scanning

## Support

For issues with:

- **Next.js/Node.js**: [Next.js Docs](https://nextjs.org/docs)
- **Prisma**: [Prisma Docs](https://www.prisma.io/docs/)
- **Docker**: [Docker Docs](https://docs.docker.com/)
- **Nginx**: [Nginx Docs](https://nginx.org/en/docs/)
- **Let's Encrypt**: [Certbot Docs](https://certbot.eff.org/docs/)
