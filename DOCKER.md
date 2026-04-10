# 🐳 Docker & CI/CD Quick Start

## CI/CD Pipeline (Automated)

This project has 3 GitHub Actions workflows:

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | Push / PR to `main` | Lint → Build → Test (frontend + backend) |
| `deploy.yml` | Push to `main` or `v*` tag | Build & push Docker images to GHCR |
| `deploy-prod.yml` | After `deploy.yml` succeeds | SSH deploy to production server |

### Setup CI/CD

1. **Add repository secrets** (Settings → Secrets → Actions):
   - `SERVER_HOST` — Production server IP
   - `SERVER_USER` — SSH username
   - `SERVER_SSH_KEY` — SSH private key

2. **Add repository variables** (Settings → Variables → Actions):
   - `VITE_API_URL` — Production backend URL

3. **Create `production` environment** (Settings → Environments):
   - Add protection rules if you want approval before deploy

4. Push to `main` — CI runs automatically. Tag `v1.0.0` for release.

---

## Docker (Manual)

## Development (Local)

```bash
# 1. Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env

# 2. Start all services
docker compose up -d --build

# 3. Run database migrations
docker compose exec backend npx prisma migrate deploy

# 4. Seed sample data
docker compose exec backend node dist/seed.js

# 5. Access the app
# Frontend: http://localhost:8080
# Backend:  http://localhost:5000
# Database: localhost:5432
```

## Production (With External Database)

```bash
# 1. Fill in production values
cp backend/.env.production backend/.env
# Edit backend/.env with your real API keys and DATABASE_URL

# 2. Comment out the 'db' service in docker-compose.yml
#    (or create a separate docker-compose.prod.yml without it)

# 3. Build and start
docker compose up -d --build

# 4. Run migrations
docker compose exec backend npx prisma migrate deploy

# 5. Seed data (optional)
docker compose exec backend node dist/seed.js
```

## Useful Commands

```bash
# View logs
docker compose logs -f

# View backend logs only
docker compose logs -f backend

# Restart a service
docker compose restart backend

# Stop everything
docker compose down

# Stop and remove volumes (destroys database!)
docker compose down -v

# Rebuild after code changes
docker compose up -d --build

# Run a one-off command in backend container
docker compose run backend npx prisma studio

# Check service health
docker compose ps
```

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend    │────▶│  PostgreSQL │
│  (nginx)    │     │  (Express)   │     │             │
│  :8080→80   │     │  :5000       │     │  :5432      │
└─────────────┘     └──────────────┘     └─────────────┘
```

- **Frontend**: Vite + React built to static files, served by nginx
- **Backend**: Express.js + TypeScript compiled to JS, runs on Node.js
- **Database**: PostgreSQL 16 with persistent volume

## Ports

| Service | Container Port | Host Port | Purpose |
|---|---|---|---|
| Frontend | 80 | 8080 | Web app |
| Backend | 5000 | 5000 | REST API + Socket.io |
| PostgreSQL | 5432 | 5432 | Database |
