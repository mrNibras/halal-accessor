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
# 1. Set up Neon Database (see NEON_SETUP.md)
# Fill in backend/.env with your Neon connection strings

# 2. (Optional) Start local PostgreSQL instead of Neon:
docker compose -f docker-compose.dev.yml up -d

# 3. Start app services
docker compose up -d --build

# 4. Run database migrations (pushes schema to Neon or local DB)
docker compose exec backend npx prisma db push

# 5. Seed sample data
docker compose exec backend npx ts-node src/seed.ts

# 6. Access the app
# Frontend: http://localhost:8080
# Backend:  http://localhost:5000
```

## Production

```bash
# 1. Fill in production values
cp backend/.env.production backend/.env
# Edit backend/.env with your Neon connection strings + real API keys

# 2. Build and start
docker compose up -d --build

# 3. Run migrations (Neon)
docker compose exec backend npx prisma migrate deploy

# 4. Seed data (optional)
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
┌─────────────┐     ┌──────────────┐     ┌─────────────────────┐
│  Frontend   │────▶│   Backend    │────▶│  Neon (Serverless)  │
│  (nginx)    │     │  (Express)   │    │  PostgreSQL         │
│  :8080→80   │     │  :5000       │    │  neon.tech            │
└─────────────┘     └──────────────┘     └─────────────────────┘
```

- **Frontend**: Vite + React built to static files, served by nginx
- **Backend**: Express.js + TypeScript compiled to JS, runs on Node.js
- **Database**: Neon Serverless PostgreSQL (cloud-hosted, no container needed)

## Ports

| Service | Container Port | Host Port | Purpose |
|---|---|---|---|
| Frontend | 80 | 8080 | Web app |
| Backend | 5000 | 5000 | REST API + Socket.io |
| Neon DB | N/A (cloud) | N/A | Database (hosted at neon.tech) |
