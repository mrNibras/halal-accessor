import { prisma } from "../../config/prisma";

export const getOrCreateCart = async (userId: string) => {
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: { include: { product: true } } },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: { items: { include: { product: true } } },
    });
  }

  return cart;
};

export const getCartWithTotals = async (userId: string) => {
  const cart = await getOrCreateCart(userId);

  let totalAmount = 0;

  const items = cart.items.map((item) => {
    const itemTotal = item.product.price * item.quantity;
    totalAmount += itemTotal;

    return {
      id: item.id,
      productId: item.productId,
      name: item.product.name,
      price: item.product.price,
      imageUrl: item.product.imageUrl,
      quantity: item.quantity,
      itemTotal,
    };
  });

  return { items, totalAmount, totalItems: cart.items.length };
};

export const addToCart = async (userId: string, productId: string, quantity: number) => {
  const cart = await getOrCreateCart(userId);

  // Verify product exists and has stock
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error("Product not found");
  if (product.stock < quantity) throw new Error("Insufficient stock");

  const existing = cart.items.find((item) => item.productId === productId);

  if (existing) {
    const newQuantity = existing.quantity + quantity;
    if (product.stock < newQuantity) throw new Error("Insufficient stock");

    return prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: newQuantity },
      include: { product: true },
    });
  }

  return prisma.cartItem.create({
    data: { cartId: cart.id, productId, quantity },
    include: { product: true },
  });
};

export const updateCartItem = async (userId: string, itemId: string, quantity: number) => {
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cart: { userId } },
    include: { product: true },
  });

  if (!item) throw new Error("Cart item not found");
  if (item.product.stock < quantity) throw new Error("Insufficient stock");

  return prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity },
    include: { product: true },
  });
};

export const removeCartItem = async (userId: string, itemId: string) => {
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cart: { userId } },
  });

  if (!item) throw new Error("Cart item not found");

  return prisma.cartItem.delete({ where: { id: itemId } });
};

export const clearCart = async (userId: string) => {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) return;

  return prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
};
