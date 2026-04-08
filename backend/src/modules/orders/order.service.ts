import { prisma } from "../../config/prisma";

export const createOrder = async (
  userId: string,
  data: { deliveryType: "PICKUP" | "DELIVERY"; latitude?: number; longitude?: number }
) => {
  // 1. Get cart with items and real product prices
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: { include: { product: true } } },
  });

  if (!cart || cart.items.length === 0) {
    throw new Error("Cart is empty");
  }

  // 2. Validate stock and calculate total (NEVER trust frontend)
  let totalAmount = 0;
  const orderItems: { productId: string; quantity: number; price: number }[] = [];

  for (const cartItem of cart.items) {
    const product = cartItem.product;

    if (!product) throw new Error(`Product ${cartItem.productId} not found`);
    if (product.stock < cartItem.quantity) {
      throw new Error(`Insufficient stock for "${product.name}". Available: ${product.stock}`);
    }

    const lineTotal = product.price * cartItem.quantity;
    totalAmount += lineTotal;

    orderItems.push({
      productId: product.id,
      quantity: cartItem.quantity,
      price: product.price,
    });
  }

  // 3. Calculate delivery fee
  let deliveryFee = 0;

  if (data.deliveryType === "DELIVERY") {
    if (!data.latitude || !data.longitude) {
      throw new Error("Location coordinates required for delivery");
    }

    const { calculateDistance, calculateDeliveryFee } = await import("../delivery/delivery.service");
    const { distanceKm } = await calculateDistance(data.latitude, data.longitude);
    deliveryFee = calculateDeliveryFee(distanceKm);
  }

  const finalAmount = totalAmount + deliveryFee;

  // 4. Create order with transaction
  const order = await prisma.$transaction(async (tx) => {
    const createdOrder = await tx.order.create({
      data: {
        userId,
        totalAmount,
        deliveryFee,
        finalAmount,
        deliveryType: data.deliveryType,
        latitude: data.latitude,
        longitude: data.longitude,
        items: {
          create: orderItems,
        },
      },
      include: { items: true, user: { select: { name: true, phone: true } } },
    });

    // Clear cart
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return createdOrder;
  });

  return order;
};

export const getUserOrders = async (userId: string) => {
  return prisma.order.findMany({
    where: { userId },
    include: {
      items: { include: { product: true } },
      payment: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

export const getOrder = async (userId: string, orderId: string) => {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: {
      items: { include: { product: true } },
      payment: true,
      chat: {
        include: { messages: { include: { sender: { select: { id: true, name: true } } } } },
      },
    },
  });

  if (!order) throw new Error("Order not found");

  return order;
};

export const getAllOrders = async () => {
  return prisma.order.findMany({
    include: {
      user: { select: { id: true, name: true, phone: true } },
      items: { include: { product: true } },
      payment: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

export const updateOrderStatus = async (
  orderId: string,
  status: "PENDING" | "PAID" | "PROCESSING" | "DELIVERED" | "CANCELLED"
) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");

  return prisma.order.update({
    where: { id: orderId },
    data: { status },
  });
};
