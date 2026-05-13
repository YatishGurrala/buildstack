# Buildstack Backend Foundation

A reusable multi-project backend platform using Next.js + TypeScript + Prisma, designed for rapid MVP experimentation with low infrastructure costs.

## Features

- **Centralized PostgreSQL database** (separate schemas per project)
- **Modular API architecture** for independent projects
- **Google Sign-In authentication** with JWT access/refresh tokens
- **Shared auth utilities** across all project routes
- **Scalable structure** for adding new applications easily
- **Docker-ready** for single VPS deployment (~$10-20/month)

## Prerequisites

1. **Node.js** 20+
2. **PostgreSQL** 16+ (local or cloud)
3. **Docker** (optional, for easy local Postgres)
4. **Google OAuth credentials** (for authentication)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

```bash
# Copy template and customize
cp .env.example .env
```

Edit [.env](.env) with your values:

```env
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Database URLs (control plane + shared app data)
CORE_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/core_db
PROJECTS_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/projects_db

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# JWT
JWT_SECRET=replace-with-a-very-long-random-secret-at-least-32-chars

# Tokens
ACCESS_TOKEN_TTL_MINUTES=15
REFRESH_TOKEN_TTL_DAYS=30

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

### 3. Start PostgreSQL

**Option A: Using Docker (recommended for local dev)**

```bash
npm run db:up
```

This starts a PostgreSQL container with the control-plane database and the shared projects database.

**Option B: Use existing Postgres**

Update `CORE_DATABASE_URL` and `PROJECTS_DATABASE_URL` in [.env](.env) to your database connection strings, then create the two databases manually:

```sql
CREATE DATABASE core_db;
CREATE DATABASE projects_db;
```

### 4. Run Database Migrations

```bash
npm run prisma:migrate
```

This will:

- Create tables in core_db (users, sessions, projects, memberships)
- Provision project metadata used to create per-project schemas inside projects_db

### 5. Seed Initial Data (Optional)

```bash
npm run seed:core
npm run seed:project1
npm run seed:project2
```

### 6. Start Development Server

```bash
npm run dev
```

Server runs on `http://localhost:3000`

## Verify It Works

### Health Check

```bash
curl http://localhost:3000/api/health
```

Should return:

```json
{
  "ok": true,
  "service": "buildstack-backend",
  "ts": "2026-04-17T..."
}
```

## Quick Test with Web Client

Open the built-in test client in your browser:

```
http://localhost:3000/test-client.html
```

### What You Can Do:

1. **Sign in with Google** — Click the Google Sign-In button
2. **Create projects** — Each project provisions its own schema inside `projects_db`
3. **View responses** — See formatted JSON responses in real-time
4. **Copy tokens** — Access tokens visible for manual cURL testing

No additional setup required — the test client connects to your local backend!

## App Screens

- The home page is the global project list.
- Project pages focus on a single backend workspace and keep the visible details narrow so the important actions stay easy to scan.
- The API panel is the main place to create keys and get connection snippets.
- Settings, storage, SQL, and analytics are separate pages so each task stays focused.

## API Endpoints

### Core Auth Endpoints

| Method | Path                     | Description                |
| ------ | ------------------------ | -------------------------- |
| POST   | `/api/core/auth/google`  | Login with Google ID token |
| POST   | `/api/core/auth/refresh` | Refresh access token       |
| POST   | `/api/core/auth/logout`  | Revoke session             |

### Project1 Endpoints (Notes)

| Method | Path                      | Description         |
| ------ | ------------------------- | ------------------- |
| GET    | `/api/project1/notes`     | List user's notes   |
| POST   | `/api/project1/notes`     | Create a new note   |
| GET    | `/api/project1/notes/:id` | Get a specific note |
| PATCH  | `/api/project1/notes/:id` | Update a note       |
| DELETE | `/api/project1/notes/:id` | Delete a note       |

### Project2 Endpoints (Tasks)

| Method | Path                      | Description              |
| ------ | ------------------------- | ------------------------ |
| GET    | `/api/project2/tasks`     | List user's tasks        |
| POST   | `/api/project2/tasks`     | Create a new task        |
| GET    | `/api/project2/tasks/:id` | Get a specific task      |
| PATCH  | `/api/project2/tasks/:id` | Update a task (+ toggle) |
| DELETE | `/api/project2/tasks/:id` | Delete a task            |

## Authentication Flow

1. **Frontend** gets Google ID token from Google SDK
2. **Frontend** POSTs token to `/api/core/auth/google`
3. **Backend** verifies token with Google, creates/updates user
4. **Backend** returns JWT access token + refresh token (as HttpOnly cookies)
5. **Frontend** uses access token in `Authorization: Bearer <token>` header for protected endpoints
6. **Token expires** → frontend calls `/api/core/auth/refresh` to get new access token
7. **Logout** → frontend calls `/api/core/auth/logout` to revoke session

## Example Usage

### Login with Google

```bash
curl -X POST http://localhost:3000/api/core/auth/google \
  -H "Content-Type: application/json" \
  -d '{"idToken": "your-google-id-token"}'
```

Response:

```json
{
  "user": {
    "id": "clxyz123...",
    "email": "user@example.com",
    "name": "John Doe",
    "picture": "https://..."
  },
  "accessToken": "eyJhbGc..."
}
```

### Create a Note (Project1)

```bash
curl -X POST http://localhost:3000/api/project1/notes \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{"title": "My Note", "body": "Some content"}'
```

### Get All Notes

```bash
curl http://localhost:3000/api/project1/notes \
  -H "Authorization: Bearer eyJhbGc..."
```

### Get a Specific Note

```bash
curl http://localhost:3000/api/project1/notes/clxyz123 \
  -H "Authorization: Bearer eyJhbGc..."
```

### Update a Note

```bash
curl -X PATCH http://localhost:3000/api/project1/notes/clxyz123 \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title", "body": "Updated content"}'
```

### Delete a Note

```bash
curl -X DELETE http://localhost:3000/api/project1/notes/clxyz123 \
  -H "Authorization: Bearer eyJhbGc..."
```

### Create a Task (Project2)

```bash
curl -X POST http://localhost:3000/api/project2/tasks \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{"title": "Do something", "description": "Details here"}'
```

### Mark Task Complete

```bash
curl -X PATCH http://localhost:3000/api/project2/tasks/clxyz456 \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{"isDone": true}'
```

## Folder Structure

```
src/
├── app/
│   ├── api/
│   │   ├── health/                    # Health check endpoint
│   │   ├── core/auth/                 # Auth route handlers
│   │   │   ├── google/
│   │   │   ├── refresh/
│   │   │   └── logout/
│   │   ├── project1/notes/            # Project1 API
│   │   └── project2/tasks/            # Project2 API
│   ├── page.tsx                       # Landing page
│   └── layout.tsx
├── core/                              # Shared backend logic
│   ├── auth/                          # Auth services & guards
│   │   ├── google.ts                  # Google token verification
│   │   ├── tokens.ts                  # JWT sign/verify
│   │   ├── session.ts                 # Cookie management
│   │   ├── guard.ts                   # Auth middleware
│   │   └── auth.service.ts            # Auth business logic
│   └── db/                            # Prisma clients
│       ├── core.ts
│       ├── project1.ts
│       └── project2.ts
├── modules/                           # Project-specific logic
│   ├── project1/
│   │   ├── project1.service.ts
│   │   ├── project1.repository.ts
│   │   └── project1.schemas.ts
│   └── project2/
│       ├── project2.service.ts
│       ├── project2.repository.ts
│       └── project2.schemas.ts
├── lib/                               # Shared utilities
│   ├── env.ts                         # Environment config
│   ├── logger.ts                      # Logging
│   ├── http.ts                        # Error handling & responses
│   ├── cors.ts                        # CORS helpers
│   ├── rate-limit.ts                  # Rate limiting
│   └── hash.ts                        # Crypto utilities
└── generated/                         # Generated Prisma clients

prisma/
├── core/schema.prisma                 # Core schema (users, sessions)
├── project1/schema.prisma             # Project1 schema (notes)
└── project2/schema.prisma             # Project2 schema (tasks)
```

## Adding a New Project

To add **project3**:

1. **Create schema:**

```bash
mkdir -p prisma/project3
cat > prisma/project3/schema.prisma << 'EOF'
generator client {
  provider = "prisma-client-js"
  output   = "../../src/generated/project3"
}

datasource db {
  provider = "postgresql"
  url      = env("PROJECT3_DATABASE_URL")
}

model YourModel {
  id        String   @id @default(cuid())
  ownerId   String
  title     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([ownerId])
}
EOF
```

2. **Add env variable** to [.env](.env):

```env
PROJECT3_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/project3_db
```

3. **Create database:**

```sql
CREATE DATABASE project3_db;
```

4. **Generate and migrate:**

```bash
npx prisma generate --schema prisma/project3/schema.prisma
npx prisma migrate dev --schema prisma/project3/schema.prisma --name init_project3
```

5. **Create API routes** in `src/app/api/project3/...`

6. **Add to package.json scripts** (optional):

```json
"prisma:generate:project3": "prisma generate --schema prisma/project3/schema.prisma",
"prisma:migrate:project3": "prisma migrate dev --schema prisma/project3/schema.prisma"
```

## Request Logging

All API requests are automatically logged with the following information:

- **Request method** (GET, POST, etc.)
- **Request path** (/api/project1/notes)
- **Response status code** (200, 404, 500, etc.)
- **Response time** (in milliseconds)
- **Authenticated user ID** (if available)
- **Timestamp** (when request was received)

### Log Format

**Development Mode** (pretty-printed):

```
GET /api/project1/notes - 200 (45ms)
```

**Production Mode** (structured JSON for log aggregation):

```json
{
  "level": 30,
  "time": 1713369600000,
  "requestId": "a3b2c1d0",
  "method": "GET",
  "path": "/api/project1/notes",
  "status": 200,
  "duration": "45ms",
  "userId": "user_123",
  "timestamp": "2025-04-17T12:00:00Z",
  "msg": "GET /api/project1/notes - 200 (45ms)"
}
```

### Viewing Logs

**Local Development:**

Logs print to console automatically. Set `NODE_ENV=development` for pretty-printing:

```bash
NODE_ENV=development npm run dev
```

**Production with Docker:**

Logs output to stdout. Capture with:

```bash
docker logs buildstack-api
```

### Sensitive Data

Logs deliberately exclude:

- Request/response bodies (to avoid logging passwords, tokens, PII)
- Authorization headers (tokens not logged)
- Query parameters with sensitive values

If you need to log specific fields, add custom logging in your route handlers using the `logger` utility from `src/lib/logger.ts`.

## Troubleshooting

### "Cannot find module '@/generated/core'"

Run Prisma generation:

```bash
npm run prisma:generate
```

### Database connection error

Check [.env](.env) database URLs are correct and databases exist:

```bash
psql -U postgres -h localhost -c "SELECT datname FROM pg_database;"
```

### Migrations failed

Roll back and retry:

```bash
npm run prisma:migrate -- --schema prisma/core/schema.prisma -- --name rollback
```

### Port 3000 already in use

Change PORT in [.env](.env) or kill the process using port 3000.

## Development Commands

```bash
# Format and lint
npm run lint

# Build for production
npm run build

# Start production build
npm run start

# Regenerate all Prisma clients
npm run prisma:generate

# Run all migrations
npm run prisma:migrate

# Seed all projects
npm run seed:core && npm run seed:project1 && npm run seed:project2

# Stop database container
npm run docker:down
```

## Deployment

For complete deployment instructions to a production VPS, see [DEPLOY.md](DEPLOY.md).

### Quick Docker Deployment (Local)

```bash
npm run db:up
```

This builds and starts:

- PostgreSQL container (with 3 databases)
- Next.js API container

### VPS Deployment

For production deployment to AWS, Linode, DigitalOcean, or any VPS:

1. See [DEPLOY.md](DEPLOY.md) for complete step-by-step guide
2. Covers: SSH setup, Docker install, Nginx, SSL/TLS, health checks, monitoring, backups
3. Estimated cost: $5-10/month for 1GB RAM VPS

## Best Practices

- **Never commit [.env](.env)** — always use [.env.example](.env.example) template
- **Rotate JWT_SECRET regularly** in production
- **Use strong database passwords** in production
- **Monitor API logs** for unusual patterns
- **Set CORS_ORIGINS carefully** — restrict to your frontend domains
- **Always use HTTPS** in production
- **Rate limit auth endpoints** before releasing publicly

## What's Next?

- [ ] Set up Google OAuth in Google Cloud Console
- [ ] Test endpoints with Postman or cURL
- [ ] Add custom logging to fit your needs
- [ ] Deploy to VPS or cloud platform
- [ ] Add project membership authorization (future enhancement)
- [ ] Add request/response metrics

## Support

For issues:

1. Check troubleshooting section above
2. Review [.env](.env) — most issues are config-related
3. Check database logs:

```bash
docker logs buildstack-db
```

4. Check API logs (see terminal output when running `npm run dev`)

---

Happy building! 🚀
