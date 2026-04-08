# HalalAccessor Backend — Production-Grade Express + TypeScript + Prisma

## 🏗️ Architecture

```
Frontend (React/Vite/Supabase)
         ↓ HTTPS
Backend (Express + TypeScript)
         ↓
Prisma ORM
         ↓
PostgreSQL Database
         ↓
External: Chapa (Payment), Google Maps (Delivery), Socket.io (Chat)
```

## 📁 Structure

```
src/
├── modules/
│   ├── auth/          — JWT register, login, refresh, getMe
│   ├── products/      — CRUD (public read, admin write)
│   ├── cart/          — Persistent cart with real-time price calc
│   ├── orders/        — Secure checkout with backend price calc
│   ├── payments/      — Chapa integration + webhook + transactions
│   ├── delivery/      — Distance-based fee (Google Maps + Haversine fallback)
│   └── chat/          — Order-linked chat with Socket.io real-time
├── shared/
│   ├── middleware/    — Auth guard (JWT + roles), error handler
│   ├── utils/         — Zod validator
│   └── validators/    — All Zod schemas
├── config/
│   └── prisma.ts
├── app.ts             — Express setup + routes
└── server.ts          — HTTP server + Socket.io
```

## 🗄️ Database Models

| Model | Description |
|-------|-------------|
| **User** | Customers & Admin (JWT auth, phone-based) |
| **Product** | Catalog with price, stock, category |
| **Category** | Product grouping |
| **Cart** | Persistent per-user cart |
| **CartItem** | Products in cart with quantities |
| **Order** | Secure order with backend-calculated totals |
| **OrderItem** | Line items with snapshot prices |
| **Payment** | Chapa payment records + status |
| **PaymentLog** | Audit trail for every payment event |
| **Chat** | Linked to one order (customer ↔ seller) |
| **Message** | Real-time messages via Socket.io |

## 🔐 Security Features

- **JWT auth** — 15min access token + 7d refresh token
- **Role-based access** — `CUSTOMER` / `ADMIN`
- **Zod validation** — All inputs validated on the backend
- **Backend price calculation** — NEVER trust frontend totals
- **Prisma transactions** — Payment → Order → Stock in one atomic operation
- **Idempotent webhooks** — Prevent double-processing payments
- **RLS-style middleware** — Users can only access their own data

## 💳 Payment Flow (Chapa)

1. User creates order → stored as `PENDING`
2. User clicks "Pay" → backend calls Chapa API
3. Chapa returns checkout URL → user pays
4. Chapa calls `/api/payments/webhook` → backend verifies
5. **Transaction**: Payment → `SUCCESS`, Order → `PAID`, Stock decremented
6. Audit log created for compliance

## 💬 Chat Flow (Socket.io + Order-Linked)

1. Customer places order → order appears in their dashboard
2. Customer clicks "Chat about this order" → chat created automatically
3. Real-time Socket.io connection — messages delivered instantly
4. Seller can respond from admin dashboard
5. Messages stored in DB (linked to order for context)
6. Typing indicators + join/leave events

## 📍 Delivery Pricing

- **With Google Maps API**: Distance Matrix for accurate road distance
- **Without API**: Haversine formula (straight-line distance) as fallback
- **Formula**: `baseFee (50 ETB) + distanceKm × perKm (20 ETB)`
- **Max range**: 50km (configurable)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- (Optional) Google Maps API key
- (Optional) Chapa payment account

### Setup

```bash
cd backend
npm install
```

### Configure Environment

```bash
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/halal_accessor?schema=public"
JWT_ACCESS_SECRET="your_access_secret"
JWT_REFRESH_SECRET="your_refresh_secret"
PORT=5000

# Shop location (Bale Robe, Ethiopia)
SHOP_LAT=7.1221
SHOP_LNG=40.0098

# Optional: Google Maps for distance-based delivery
GOOGLE_MAPS_API_KEY=your_key_here

# Optional: Chapa payment
CHAPA_SECRET_KEY=your_key_here
CHAPA_PUBLIC_KEY=your_key_here
CHAPA_WEBHOOK_SECRET=your_key_here
CHAPA_CALLBACK_URL=http://localhost:3000/payment/callback
CHAPA_BASE_URL=https://api.chapa.co

FRONTEND_URL=http://localhost:5173
```

### Database Migration

```bash
npx prisma migrate dev --name init
```

### Run Dev Server

```bash
npm run dev
```

Server starts on `http://localhost:5000` with Socket.io ready.

### Build for Production

```bash
npm run build
npm start
```

## 🔌 API Endpoints

### Auth
| Method | Path | Auth | Body |
|--------|------|------|------|
| POST | `/api/auth/register` | ❌ | `name, phone, password` |
| POST | `/api/auth/login` | ❌ | `phone, password` |
| POST | `/api/auth/refresh` | ❌ | `refreshToken` |
| GET | `/api/auth/me` | ✅ | — |

### Products
| Method | Path | Auth | Body |
|--------|------|------|------|
| GET | `/api/products` | ❌ | `?category=&search=&featured=` |
| GET | `/api/products/categories` | ❌ | — |
| GET | `/api/products/:id` | ❌ | — |
| POST | `/api/products` | ADMIN | `name, price, stock, ...` |
| PUT | `/api/products/:id` | ADMIN | Partial product |
| DELETE | `/api/products/:id` | ADMIN | — |

### Cart
| Method | Path | Auth | Body |
|--------|------|------|------|
| GET | `/api/cart` | ✅ | — |
| POST | `/api/cart` | ✅ | `productId, quantity` |
| PUT | `/api/cart/:itemId` | ✅ | `quantity` |
| DELETE | `/api/cart/:itemId` | ✅ | — |
| DELETE | `/api/cart` | ✅ | — |

### Orders
| Method | Path | Auth | Body |
|--------|------|------|------|
| POST | `/api/orders` | ✅ | `deliveryType, latitude?, longitude?` |
| GET | `/api/orders/my-orders` | ✅ | — |
| GET | `/api/orders/:id` | ✅ | — |
| GET | `/api/orders` | ADMIN | — |
| PUT | `/api/orders/:id/status` | ADMIN | `status` |

### Payments
| Method | Path | Auth | Body |
|--------|------|------|------|
| POST | `/api/payments/create` | ✅ | `orderId` |
| GET | `/api/payments/verify/:paymentId` | ✅ | — |
| POST | `/api/payments/webhook` | ❌ | Chapa webhook payload |

### Delivery
| Method | Path | Auth | Body |
|--------|------|------|------|
| POST | `/api/delivery/fee` | ❌ | `lat, lng` |

### Chat (REST)
| Method | Path | Auth | Body |
|--------|------|------|------|
| GET | `/api/chat` | ✅ | — |
| POST | `/api/chat` | ✅ | `orderId` |
| GET | `/api/chat/order/:orderId` | ✅ | — |
| GET | `/api/chat/:chatId/messages` | ✅ | — |
| POST | `/api/chat/message` | ✅ | `chatId, content` |

### Chat (Socket.io Events)
| Event | Direction | Payload |
|-------|-----------|---------|
| `join:chat` | Client → Server | `chatId` |
| `leave:chat` | Client → Server | `chatId` |
| `send:message` | Client → Server | `{ chatId, content }` |
| `message:new` | Server → Client | `Message` object |
| `typing:start` | Client → Server | `{ chatId }` |
| `typing:stop` | Client → Server | `{ chatId }` |
| `typing:user` | Server → Client | `{ userId, chatId, isTyping }` |
| `error` | Server → Client | `{ message }` |

## 🧪 Testing the Full Chat Flow

### 1. Start the backend
```bash
npm run dev
```

### 2. Create an admin user (seed)
```sql
INSERT INTO "User" (id, name, phone, password, role)
VALUES (gen_random_uuid(), 'Admin', '+251900000000', '$2b$12$...', 'ADMIN');
```

### 3. Customer flow
```bash
# Register a customer
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","phone":"+251911111111","password":"password123"}'

# Login and get accessToken
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+251911111111","password":"password123"}'
```

### 4. Place an order
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"deliveryType":"PICKUP"}'
```

### 5. Create chat for the order
```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"orderId":"<ORDER_ID>"}'
```

### 6. Connect via Socket.io (browser)
```js
import io from "socket.io-client";

const socket = io("http://localhost:5000", {
  auth: { token: "<ACCESS_TOKEN>" },
});

// Join the chat
socket.emit("join:chat", "<CHAT_ID>");

// Send a message
socket.emit("send:message", { chatId: "<CHAT_ID>", content: "Can I get a discount?" });

// Listen for new messages
socket.on("message:new", (message) => {
  console.log("New message:", message.content, "from", message.sender.name);
});
```

### 7. Admin responds (second terminal / admin panel)
```bash
# Admin logs in
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+251900000000","password":"admin_password"}'

# Admin joins same chat via Socket.io and responds
```

## 📦 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with auto-reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run production server |
| `npm run prisma:migrate` | Run migrations |
| `npm run prisma:studio` | Open Prisma Studio (DB GUI) |
