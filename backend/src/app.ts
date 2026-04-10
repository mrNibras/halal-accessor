import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";

import authRoutes from "./modules/auth/auth.routes";
import productRoutes from "./modules/products/product.routes";
import cartRoutes from "./modules/cart/cart.routes";
import orderRoutes from "./modules/orders/order.routes";
import paymentRoutes from "./modules/payments/payment.routes";
import deliveryRoutes from "./modules/delivery/delivery.routes";
import chatRoutes from "./modules/chat/chat.routes";

const app = express();

// ─── Security headers (Helmet) ───
app.use(helmet());

// ─── Trust proxy (for rate limiting behind reverse proxy) ───
// Enable if behind nginx/Caddy/Cloudflare
app.set("trust proxy", 1);

// ─── Global rate limiter (applies to all routes) ───
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: "draft-8", // RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  message: { error: "Too many requests, please try again later." },
});
app.use(globalLimiter);

// ─── Serve static files (test dashboard) ───
app.use(express.static(path.join(__dirname, "..", "public")));

// ─── CORS ───
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "10kb" })); // Body size limit
app.use(cookieParser());

// Health check (not rate-limited beyond global limit)
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Route-specific rate limiters ───

// Auth endpoints: stricter (prevent brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per window
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many authentication attempts, please try again later." },
});
app.use("/api/auth", authLimiter, authRoutes);

// Payment endpoints: strict (prevent abuse)
// Note: webhook is mounted separately to skip rate limiting (Chapa callback)
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many payment requests, please try again later." },
});
app.use("/api/payments", paymentLimiter, paymentRoutes);

// Products: moderate (public, can be crawled)
const productsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
app.use("/api/products", productsLimiter, productRoutes);

// Other API routes: use global limiter
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/chat", chatRoutes);

export default app;
