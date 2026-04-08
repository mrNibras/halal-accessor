import { prisma } from "../../config/prisma";

export const createChat = async (userId: string, orderId: string, userRole: string) => {
  // Verify order exists and belongs to user (or user is admin)
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { chat: true },
  });

  if (!order) throw new Error("Order not found");
  if (order.userId !== userId && userRole !== "ADMIN") {
    throw new Error("Unauthorized: You don't have access to this order");
  }

  // If chat already exists, return it
  if (order.chat) {
    return order.chat;
  }

  // Create new chat linked to order
  const chat = await prisma.chat.create({
    data: {
      orderId,
    },
  });

  return chat;
};

export const getChatByOrderId = async (userId: string, orderId: string, userRole: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      chat: {
        include: {
          messages: {
            include: {
              sender: { select: { id: true, name: true, role: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      user: { select: { id: true, name: true, phone: true } },
    },
  });

  if (!order) throw new Error("Order not found");
  if (order.userId !== userId && userRole !== "ADMIN") {
    throw new Error("Unauthorized: You don't have access to this order");
  }

  return {
    chat: order.chat,
    orderUser: order.user,
    orderStatus: order.status,
    finalAmount: order.finalAmount,
  };
};

export const sendMessage = async (
  chatId: string,
  senderId: string,
  content: string
) => {
  // Verify chat exists
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: { order: true },
  });

  if (!chat) throw new Error("Chat not found");

  // Verify sender is the order owner or an admin
  const user = await prisma.user.findUnique({ where: { id: senderId } });
  if (!user) throw new Error("User not found");

  if (chat.order.userId !== senderId && user.role !== "ADMIN") {
    throw new Error("Unauthorized: You cannot send messages to this chat");
  }

  const message = await prisma.message.create({
    data: {
      chatId,
      senderId,
      content,
    },
    include: {
      sender: { select: { id: true, name: true, role: true } },
    },
  });

  return message;
};

export const getChatMessages = async (
  userId: string,
  chatId: string,
  userRole: string
) => {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: {
      order: true,
      messages: {
        include: {
          sender: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!chat) throw new Error("Chat not found");
  if (chat.order.userId !== userId && userRole !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  return chat.messages;
};

export const getUserChats = async (userId: string, userRole: string) => {
  if (userRole === "ADMIN") {
    // Admin sees all chats
    return prisma.chat.findMany({
      include: {
        order: {
          include: {
            user: { select: { id: true, name: true, phone: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { sender: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // Customer sees only their order chats
  const orders = await prisma.order.findMany({
    where: { userId },
    include: {
      chat: {
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { sender: { select: { id: true, name: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return orders.filter((o) => o.chat).map((o) => ({
    ...o.chat!,
    order: {
      id: o.id,
      status: o.status,
      finalAmount: o.finalAmount,
      createdAt: o.createdAt,
    },
  }));
};
