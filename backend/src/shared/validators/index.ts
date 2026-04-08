import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(6).max(20),
  password: z.string().min(6).max(100),
});

export const loginSchema = z.object({
  phone: z.string().min(6),
  password: z.string().min(1),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  price: z.number().int().positive(),
  stock: z.number().int().min(0),
  imageUrl: z.string().url().optional(),
  categoryId: z.string().uuid().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const cartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1),
});

export const createOrderSchema = z.object({
  deliveryType: z.enum(["PICKUP", "DELIVERY"]),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const createPaymentSchema = z.object({
  orderId: z.string().uuid(),
});

export const deliveryFeeSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export const sendMessageSchema = z.object({
  chatId: z.string().uuid(),
  content: z.string().min(1).max(5000),
});

export const createChatSchema = z.object({
  orderId: z.string().uuid(),
});
