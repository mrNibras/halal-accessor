# 🧊 Neon Database Setup Guide

This project uses **Neon Serverless PostgreSQL** as its production database.

## Why Neon?
- ✅ Serverless — auto-scales, suspends when idle
- ✅ Branching — create isolated dev/test databases instantly
- ✅ Prisma-native — works seamlessly with migrations
- ✅ Security — VPC isolation, IP allowlisting, encryption at rest
- ✅ Free tier — 0.5 GB storage, 10M compute-hours/month

## Step-by-Step Setup

### 1. Create a Neon Account
Go to [console.neon.tech](https://console.neon.tech/) and sign up (GitHub, Google, or email).

### 2. Create a Project
1. Click **New Project**
2. Name it: `halal-accessor`
3. Select region closest to your users (e.g., `US East (N. Virginia)`)
4. Click **Create Project**

### 3. Get Connection Strings
After creating the project, you'll see connection details. You need **3 URLs**:

| Variable | Purpose | Where to find it |
|---|---|---|
| `DATABASE_URL` | App runtime (pooled) | Connection string with `-pooler` |
| `DIRECT_URL` | Prisma migrations | Direct connection string (no pooler) |
| `SHADOW_DATABASE_URL` | Dev migrations | Create a "shadow" branch or use same DB |

**Neon provides these in the dashboard:**
- Go to your project → **Connection Details**
- Select **Prisma** from the dropdown
- Neon will show you the exact format for each URL

### 4. Configure Your `.env`

Copy the connection strings into `backend/.env`:

```bash
# ─── Database (Neon) ───
DATABASE_URL="postgresql://halal_user:abc123@ep-cool-mountain-123456.us-east-2.aws.neon.tech/halal_accessor?sslmode=require"
DIRECT_URL="postgresql://halal_user:abc123@ep-cool-mountain-123456-pooler.us-east-2.aws.neon.tech/halal_accessor?sslmode=require"
SHADOW_DATABASE_URL="postgresql://halal_user:abc123@ep-cool-mountain-123456-pooler.us-east-2.aws.neon.tech/halal_accessor?sslmode=require"
```

> 💡 **Important:** The `?sslmode=require` is mandatory — Neon requires SSL connections.

### 5. Push the Database Schema

```bash
cd backend

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push schema to Neon
npx prisma db push

# Seed sample data
npx ts-node src/seed.ts
```

### 6. Verify

```bash
# Check tables exist
npx prisma studio

# Or run a quick health check
curl http://localhost:5000/health
```

## Production Deployment

When deploying to production:

1. Copy `backend/.env.production` to your server
2. Fill in the Neon connection strings from your **production** Neon project
3. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```
4. Seed data (optional):
   ```bash
   node dist/seed.js
   ```

## Database Branching (Dev/Test)

Neon's killer feature — create isolated copies of your database:

```bash
# Via Neon Dashboard:
# Project → Branches → Create Branch

# Name it "dev" or "staging"
# Neon gives you a new connection string for that branch

# Use the branch's DIRECT_URL for SHADOW_DATABASE_URL in dev
```

This means:
- **Main branch** → Production data
- **Dev branch** → Testing new features with copied schema (no real customer data)
- **Shadow branch** → Empty DB for Prisma's migration planning

## Troubleshooting

### "Connection refused" or "SSL required"
- Ensure `?sslmode=require` is in your connection string
- Neon **does not** allow unencrypted connections

### "Prisma migrate fails with pooler error"
- Use `DIRECT_URL` for migrations, not the pooled `DATABASE_URL`
- Pooler connections can't create/drop tables

### "Shadow database error"
- `SHADOW_DATABASE_URL` must point to an **empty** database
- Create a new branch in Neon for this, or use a fresh database

### "Compute is suspended / slow first request"
- Neon auto-suspends after 5 minutes of inactivity
- First request wakes up compute (~500ms-1s)
- This is normal for serverless — subsequent requests are fast

## Pricing

| Tier | Storage | Compute | Price |
|---|---|---|---|
| **Free** | 0.5 GB | 10M hours/mo | $0 |
| **Launch** | 10 GB | 25M hours/mo | $19/mo |
| **Scale** | 100 GB | Unlimited | $99/mo |

For a small shop in Bale Robe, the **Free tier** is more than enough to start.
