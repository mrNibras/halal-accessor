import http from "http";
import { Server } from "socket.io";
import app from "./app";
import { setupSocketIO } from "./modules/chat/chat.socket";

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Setup Socket.io with real-time chat
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  },
});

setupSocketIO(io);

server.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.io ready for real-time chat`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}\n`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
