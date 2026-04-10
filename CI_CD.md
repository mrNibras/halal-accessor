# 🤖 CI/CD Setup Guide

This project uses **GitHub Actions** for continuous integration and deployment.

## Workflows Overview

### 1. `ci.yml` — Continuous Integration
**Triggers:** Push or PR to `main` branch

**What it does:**
- Checks out code
- Installs dependencies with Bun
- Runs linter
- Builds frontend (Vite)
- Runs frontend tests (Vitest)
- Builds backend (TypeScript)
- Sets up PostgreSQL service and runs Prisma migrations
- Uploads build artifacts (for deploy workflow)

### 2. `deploy.yml` — Docker Build & Push
**Triggers:** Push to `main` or version tags (`v1.0.0`)

**What it does:**
- Builds Docker images for frontend and backend
- Pushes to GitHub Container Registry (GHCR)
- Uses BuildKit cache for faster builds
- Tags images with branch name, semver, or SHA

**Output images:**
```
ghcr.io/owner/repo-frontend:main
ghcr.io/owner/repo-backend:main
ghcr.io/owner/repo-frontend:v1.0.0
ghcr.io/owner/repo-backend:v1.0.0
```

### 3. `deploy-prod.yml` — Production Deployment
**Triggers:** After `deploy.yml` succeeds, or manually via workflow_dispatch

**What it does:**
- SSH into production server
- Pulls latest Docker images
- Runs Prisma migrations (backend)
- Restarts services
- Performs health checks
- Sends deployment notification

## Initial Setup

### Step 1: Add Repository Secrets

Go to **GitHub → Your Repo → Settings → Secrets and variables → Actions**

Click **New repository secret** and add:

| Secret | Value | Example |
|---|---|---|
| `SERVER_HOST` | Production server IP | `203.0.113.42` |
| `SERVER_USER` | SSH username | `deploy` |
| `SERVER_SSH_KEY` | SSH private key (full content) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |

**Generating SSH key for deployment:**
```bash
ssh-keygen -t ed25519 -C "github-actions-deploy"
# Add public key to server: ~/.ssh/authorized_keys
# Copy private key to GitHub secret
cat ~/.ssh/id_ed25519  # copy entire output
```

### Step 2: Add Repository Variables

Go to **GitHub → Your Repo → Settings → Secrets and variables → Actions → Variables**

Click **New repository variable** and add:

| Variable | Value | Example |
|---|---|---|
| `VITE_API_URL` | Production backend URL | `https://api.halalaccessor.com` |

### Step 3: Create Production Environment

Go to **GitHub → Your Repo → Settings → Environments**

1. Click **New environment**
2. Name it `production`
3. (Optional) Enable **Required reviewers** — add team members who must approve deployments
4. (Optional) Set **Deployment branches** — restrict to `main` only

### Step 4: Test the Pipeline

```bash
# 1. Push to main — triggers CI
git add .
git commit -m "ci: setup GitHub Actions workflows"
git push origin main

# 2. Check Actions tab on GitHub
# You should see "CI — Build & Test" running

# 3. On success, "CD — Docker Build & Push" should start
# Images will be pushed to GHCR

# 4. Manually trigger deployment
# Go to Actions → "CD — Deploy to Production" → Run workflow
```

## Workflow Diagram

```
Push to main
    │
    ├─▶ ci.yml (CI)
    │   ├─ Frontend: lint → build → test
    │   └─ Backend:  build → migrate
    │
    └─▶ deploy.yml (CD)
        ├─ Build frontend Docker image → push to GHCR
        └─ Build backend Docker image  → push to GHCR
              │
              ▼
        deploy-prod.yml (Production)
            ├─ SSH → server
            ├─ docker compose pull
            ├─ prisma migrate deploy
            ├─ docker compose up -d
            ├─ health check
            └─ deployment summary
```

## Troubleshooting

### CI Fails on Build
- Check that `bun.lock` is committed and up to date
- Verify no TypeScript errors locally: `npm run build`

### CI Fails on Backend Migration
- Ensure PostgreSQL service starts (check logs)
- Verify `DATABASE_URL` format in the workflow

### Docker Push Fails
- Check `GITHUB_TOKEN` permissions (should be automatic)
- Verify package write access: **Settings → Actions → General → Workflow permissions** → Read and write

### Deploy Fails on SSH
- Verify SSH key is correct and has no passphrase
- Test SSH manually: `ssh -i key.pem user@host`
- Check server firewall allows SSH (port 22) from GitHub Actions IPs

### Health Check Fails
- Check backend logs on server: `docker compose logs backend`
- Ensure `DATABASE_URL` is correct on server
- Verify all env vars are set in `backend/.env` on server

## Manual Deployment

If you need to deploy without CI/CD:

```bash
# On production server
cd /opt/halal-accessor

# Pull latest images
docker compose pull

# Run migrations
docker compose run --rm backend npx prisma migrate deploy

# Restart services
docker compose up -d

# Verify
docker compose ps
curl http://localhost:5000/health
curl http://localhost:8080
```
