// ─── Shared types matching backend Prisma models ───

export interface User {
  id: string;
  name: string;
  phone: string;
  role: "CUSTOMER" | "ADMIN";
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  imageUrl: string | null;
  categoryId: string | null;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  createdAt: string;
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  product: Product;
}

export interface CartResponse {
  id: string;
  userId: string;
  items: CartItem[];
  updatedAt: string;
}

export interface CreateOrderInput {
  deliveryType: "PICKUP" | "DELIVERY";
  latitude?: number;
  longitude?: number;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
  product: Product;
}

export interface Order {
  id: string;
  userId: string;
  totalAmount: number;
  deliveryFee: number;
  finalAmount: number;
  status: "PENDING" | "PAID" | "PROCESSING" | "DELIVERED" | "CANCELLED";
  deliveryType: "PICKUP" | "DELIVERY";
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  items: OrderItem[];
  user?: { name: string; phone: string };
  payment?: Payment;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  status: "PENDING" | "SUCCESS" | "FAILED";
  provider: string;
  transactionId: string | null;
  checkoutUrl: string | null;
  createdAt: string;
}

export interface CreatePaymentResponse {
  paymentId: string;
  paymentUrl: string;
}

export interface Chat {
  id: string;
  orderId: string;
  createdAt: string;
  messages: Message[];
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string; role: string };
}

export interface ChatSummary {
  id: string;
  orderId: string;
  createdAt: string;
  lastMessage: Message | null;
  order: {
    id: string;
    finalAmount: number;
    status: string;
    user: { name: string; phone: string };
  };
}

export interface DeliveryFeeResponse {
  distanceKm: number;
  deliveryFee: number;
}
