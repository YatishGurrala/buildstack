#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <repo_url> [app_dir] [domain]"
  echo "Example (IP-only): $0 https://github.com/you/buildstack.git /opt/buildstack"
  echo "Example (with domain): $0 https://github.com/you/buildstack.git /opt/buildstack api.example.com"
  exit 1
fi

REPO_URL="$1"
APP_DIR="${2:-/opt/buildstack}"
DOMAIN="${3:-}"

upsert_env() {
  local key="$1"
  local value="$2"
  local file="$3"
  if grep -q "^${key}=" "$file"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$file"
  else
    echo "${key}=${value}" >> "$file"
  fi
}

random_b64() {
  local length="$1"
  openssl rand -base64 "$length" | tr -d '\n'
}

echo "[1/9] Updating system packages"
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

echo "[2/9] Installing base packages"
apt-get install -y ca-certificates curl git nginx certbot python3-certbot-nginx ufw docker-compose-plugin

echo "[3/9] Installing Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

systemctl enable docker
systemctl start docker

echo "[4/9] Configuring firewall"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "[5/9] Cloning/updating repository"
if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" fetch --all --prune
  git -C "$APP_DIR" pull --ff-only
else
  mkdir -p "$(dirname "$APP_DIR")"
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

created_env="false"
if [[ ! -f .env ]]; then
  cp .env.example .env
  created_env="true"
  echo "Created .env from .env.example. Applying production defaults."
fi

if [[ "$created_env" == "true" ]]; then
  DB_PASSWORD="$(random_b64 18)"
  JWT_SECRET_VALUE="$(random_b64 32)"
  METRICS_TOKEN_VALUE="$(random_b64 24)"
  GRAFANA_PASSWORD_VALUE="$(random_b64 18)"

  upsert_env "NODE_ENV" "production" .env
  upsert_env "LOG_LEVEL" "warn" .env
  upsert_env "PORT" "3000" .env
  upsert_env "POSTGRES_PASSWORD" "$DB_PASSWORD" .env
  upsert_env "CORE_DATABASE_URL" "postgresql://postgres:${DB_PASSWORD}@db:5432/core_db" .env
  upsert_env "PROJECTS_DATABASE_URL" "postgresql://postgres:${DB_PASSWORD}@db:5432/projects_db" .env
  upsert_env "JWT_SECRET" "$JWT_SECRET_VALUE" .env
  upsert_env "ACCESS_TOKEN_TTL_MINUTES" "15" .env
  upsert_env "REFRESH_TOKEN_TTL_DAYS" "30" .env
  upsert_env "METRICS_SCRAPE_TOKEN" "$METRICS_TOKEN_VALUE" .env
  upsert_env "GRAFANA_ADMIN_USER" "admin" .env
  upsert_env "GRAFANA_ADMIN_PASSWORD" "$GRAFANA_PASSWORD_VALUE" .env
  upsert_env "CORS_ORIGINS" "http://<your-frontend-origin>" .env
  upsert_env "GOOGLE_CLIENT_ID" "replace-with-google-client-id.apps.googleusercontent.com" .env
fi

echo "[6/9] Building and starting API stack"
docker compose up -d --build

echo "[7/9] Waiting for API container to be healthy (migrations run on start:prod)"
timeout 120 bash -c 'until curl -sf http://localhost:3000/api/health > /dev/null; do sleep 3; done' \
  && echo "API is healthy" \
  || { echo "API did not become healthy within 120s — check: docker compose logs api"; exit 1; }

echo "[8/9] Installing Nginx site config"
if [[ ! -f deploy/nginx/buildstack.conf ]]; then
  echo "Missing deploy/nginx/buildstack.conf"
  exit 1
fi

if [[ -n "$DOMAIN" ]]; then
  sed "s/api.example.com/${DOMAIN}/g" deploy/nginx/buildstack.conf > /etc/nginx/sites-available/buildstack
else
  cat > /etc/nginx/sites-available/buildstack <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name _;

    client_max_body_size 5m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_connect_timeout 30s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location = /api/health {
        access_log off;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
fi

ln -sf /etc/nginx/sites-available/buildstack /etc/nginx/sites-enabled/buildstack
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
systemctl enable nginx

echo "[9/9] Finalizing web entrypoint"
if [[ -n "$DOMAIN" ]]; then
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "admin@${DOMAIN}" --redirect || true
else
  echo "Domain not provided: running over HTTP on VPS IP."
fi

echo "[post] Preparing Prometheus scrape token file"
mkdir -p docker/prometheus/secrets
awk -F= '/^METRICS_SCRAPE_TOKEN=/{print $2}' .env | tr -d '\r' > docker/prometheus/secrets/metrics-scrape-token
chmod 600 docker/prometheus/secrets/metrics-scrape-token

cat <<EOF

Bootstrap complete.

Next steps:
1) Set GOOGLE_CLIENT_ID in ${APP_DIR}/.env.
2) Set CORS_ORIGINS in ${APP_DIR}/.env.
3) Restart API after env updates: cd ${APP_DIR} && docker compose up -d --build
4) Start monitoring stack: docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
5) When you get a domain, rerun script with domain as third argument to enable HTTPS.

EOF
