# 🚀 Production Deployment Checklist

## 1. Fill in Environment Variables

### Backend (`backend/.env.production`)
- [ ] `DATABASE_URL` — Production PostgreSQL connection string
- [ ] `JWT_ACCESS_SECRET` — Run: `openssl rand -hex 32`
- [ ] `JWT_REFRESH_SECRET` — Run: `openssl rand -hex 32`
- [ ] `GOOGLE_MAPS_API_KEY` — Get from [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (enable Distance Matrix API)
- [ ] `CHAPA_SECRET_KEY` — Get from [Chapa Dashboard](https://dashboard.chapa.co/)
- [ ] `CHAPA_PUBLIC_KEY` — Get from Chapa Dashboard
- [ ] `CHAPA_WEBHOOK_SECRET` — Get from Chapa Dashboard
- [ ] `CHAPA_CALLBACK_URL` — Set to `https://YOUR_DOMAIN.com/payment/callback`
- [ ] `FRONTEND_URL` — Set to your production frontend domain (e.g., `https://halalaccessor.com`)

### Frontend (`.env.production`)
- [ ] `VITE_API_URL` — Your production backend URL (e.g., `https://api.halalaccessor.com`)
- [ ] `VITE_SUPABASE_*` — If still using Supabase for anything

## 2. Database Setup
- [ ] Provision PostgreSQL database
- [ ] Run Prisma migration: `cd backend && npx prisma migrate deploy`
- [ ] Run seed script: `cd backend && npx ts-node src/seed.ts`
- [ ] Verify tables exist: `User`, `Product`, `Category`, `Cart`, `CartItem`, `Order`, `OrderItem`, `Payment`, `PaymentLog`, `Chat`, `Message`

## 3. Chapa Configuration
- [ ] Register webhook URL in Chapa dashboard (`CHAPA_CALLBACK_URL`)
- [ ] Set callback URL in Chapa dashboard to match `CHAPA_CALLBACK_URL`
- [ ] Test with Chapa sandbox mode first (if available)

## 4. Google Maps
- [ ] Enable Distance Matrix API in Google Cloud Console
- [ ] Restrict API key to HTTP referrers (your domain)
- [ ] Set billing account (required for Maps API)

## 5. Build & Deploy

### Option A: Docker (Recommended)
- [ ] Copy `backend/.env.production` to `backend/.env` and fill in all values
- [ ] Run: `docker compose up -d --build`
- [ ] This starts: PostgreSQL (5432), Backend API (5000), Frontend nginx (8080)
- [ ] Run migrations: `docker compose exec backend npx prisma migrate deploy`
- [ ] Run seed: `docker compose exec backend node dist/seed.js`
- [ ] Verify: `curl http://localhost:5000/health` and `curl http://localhost:8080`

### Option B: Manual Build
- [ ] Backend: `cd backend && npm run build` → deploy `dist/` folder + `node_modules`
- [ ] Frontend: `npm run build` → deploy `dist/` folder via static hosting (Vercel, Netlify, nginx)
- [ ] Set `NODE_ENV=production` on backend
- [ ] Configure reverse proxy (nginx/Caddy) for SSL (HTTPS)
- [ ] Add CORS origin for frontend domain in backend

### Option C: Docker (Production with external DB)
- [ ] Set `DATABASE_URL` in `backend/.env` to your external PostgreSQL URL
- [ ] Remove the `db` service from `docker-compose.yml` (or comment it out)
- [ ] Run: `docker compose up -d --build backend frontend`
- [ ] Run migrations: `docker compose exec backend npx prisma migrate deploy`

## 6. Post-Deployment
- [ ] Test health check: `GET https://YOUR_API_DOMAIN.com/health`
- [ ] Test user registration and login
- [ ] Test product browsing
- [ ] Test cart add/update/remove
- [ ] Test checkout flow (order creation)
- [ ] Test payment redirect to Chapa (use test mode)
- [ ] Test webhook callback (Chapa → backend)
- [ ] Test payment callback page (`/payment/callback`)
- [ ] Test order detail page
- [ ] Test chat (Socket.io real-time messaging)
- [ ] Test admin dashboard (products CRUD, orders, chats)
- [ ] Test mobile responsiveness

## 7. Security Hardening
- [ ] Remove `console.log` statements from production backend
- [ ] Add rate limiting (e.g., `express-rate-limit`)
- [ ] Add helmet.js (`helmet()` middleware)
- [ ] Ensure CORS only allows your frontend domain
- [ ] Set `SECURE=true` on cookies (already done for production)
- [ ] Enable HTTPS (SSL certificate via Let's Encrypt)
- [ ] Remove `sourceMap: true` from backend `tsconfig.json` for production
- [ ] Restrict Google Maps API key to specific domains
- [ ] Set up monitoring/logging (e.g., Sentry, LogRocket)

## 8. Performance
- [ ] Enable CDN for frontend static assets
- [ ] Enable gzip/brotli compression on backend
- [ ] Optimize images (compress product images)
- [ ] Consider code splitting for large chunks (>500 KB warning)
- [ ] Enable HTTP/2 if possible
