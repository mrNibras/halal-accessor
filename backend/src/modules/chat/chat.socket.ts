import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma";

interface AuthSocket extends Socket {
  userId?: string;
  userRole?: string;
}

export const setupSocketIO = (io: Server) => {
  // Auth middleware for Socket.io
  io.use(async (socket: AuthSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(
        token as string,
        process.env.JWT_ACCESS_SECRET!
      ) as { id: string; role: string };

      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user) {
        return next(new Error("User not found"));
      }

      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: AuthSocket) => {
    console.log(`[Socket.io] User connected: ${socket.userId}`);

    // Join chat room
    socket.on("join:chat", async (chatId: string) => {
      if (!socket.userId) return;

      try {
        // Verify user has access to this chat
        const chat = await prisma.chat.findUnique({
          where: { id: chatId },
          include: { order: true },
        });

        if (!chat) {
          socket.emit("error", { message: "Chat not found" });
          return;
        }

        if (chat.order.userId !== socket.userId && socket.userRole !== "ADMIN") {
          socket.emit("error", { message: "Unauthorized" });
          return;
        }

        socket.join(`chat:${chatId}`);
        console.log(`[Socket.io] User ${socket.userId} joined chat:${chatId}`);
      } catch (error) {
        socket.emit("error", { message: "Failed to join chat" });
      }
    });

    // Leave chat room
    socket.on("leave:chat", (chatId: string) => {
      socket.leave(`chat:${chatId}`);
      console.log(`[Socket.io] User ${socket.userId} left chat:${chatId}`);
    });

    // Send message via Socket.io (real-time)
    socket.on("send:message", async (data: { chatId: string; content: string }) => {
      if (!socket.userId) return;

      const { chatId, content } = data;

      if (!content.trim()) {
        socket.emit("error", { message: "Message cannot be empty" });
        return;
      }

      try {
        const message = await prisma.message.create({
          data: {
            chatId,
            senderId: socket.userId,
            content: content.trim(),
          },
          include: {
            sender: { select: { id: true, name: true, role: true } },
          },
        });

        // Broadcast to all users in the chat room (including sender for confirmation)
        io.to(`chat:${chatId}`).emit("message:new", message);

        console.log(`[Socket.io] Message sent in chat:${chatId} by ${socket.userId}`);
      } catch (error) {
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Typing indicator
    socket.on("typing:start", (data: { chatId: string }) => {
      socket.to(`chat:${data.chatId}`).emit("typing:user", {
        userId: socket.userId,
        chatId: data.chatId,
        isTyping: true,
      });
    });

    socket.on("typing:stop", (data: { chatId: string }) => {
      socket.to(`chat:${data.chatId}`).emit("typing:user", {
        userId: socket.userId,
        chatId: data.chatId,
        isTyping: false,
      });
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log(`[Socket.io] User disconnected: ${socket.userId}`);
    });
  });
};
