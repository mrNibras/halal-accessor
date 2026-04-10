import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { chatApi, authApi } from "@/lib/api";
import { io, Socket } from "socket.io-client";
import { ScrollArea } from "@/components/ui/scroll-area";
import MessageBubble from "@/components/chat/MessageBubble";
import ChatInput from "@/components/chat/ChatInput";
import ConversationList from "@/components/chat/ConversationList";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  content: string;
  senderId: string;
  chatId: string;
  createdAt: string;
  sender: { id: string; name: string; role: string };
}

interface ChatSummary {
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

const ChatPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) navigate("/auth");
  }, [user, navigate]);

  // Fetch chats
  const fetchChats = useCallback(async () => {
    try {
      const data = await chatApi.getChats();
      setChats(data);
    } catch (err: any) {
      console.error("Failed to fetch chats:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch messages for a chat
  const fetchMessages = useCallback(async (chatId: string) => {
    try {
      const data = await chatApi.getMessages(chatId);
      setMessages(data);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err: any) {
      toast.error("Failed to load messages");
    }
  }, []);

  // Set up Socket.io
  useEffect(() => {
    if (!user) return;

    const token = authApi.getToken();
    const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000", {
      auth: { token },
    });

    socket.on("connect", () => {
      console.log("[Socket.io] Connected");
    });

    socket.on("message:new", (message: Message) => {
      setMessages((prev) => [...prev, message]);
      // Update chat list with last message
      setChats((prev) =>
        prev.map((c) =>
          c.id === message.chatId
            ? { ...c, lastMessage: message }
            : c
        )
      );
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });

    socket.on("error", (err: { message: string }) => {
      toast.error(err.message);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Join active chat room
  useEffect(() => {
    if (!socketRef.current || !activeChatId) return;
    socketRef.current.emit("join:chat", activeChatId);

    return () => {
      socketRef.current?.emit("leave:chat", activeChatId);
    };
  }, [activeChatId]);

  // Load data on mount
  useEffect(() => {
    if (!user) return;
    fetchChats();
  }, [user, fetchChats]);

  // When active chat changes
  useEffect(() => {
    if (activeChatId) {
      fetchMessages(activeChatId);
    } else {
      setMessages([]);
    }
  }, [activeChatId, fetchMessages]);

  // Send a message
  const handleSendMessage = async (content: string) => {
    if (!activeChatId || !socketRef.current) return;

    socketRef.current.emit("send:message", {
      chatId: activeChatId,
      content,
    });
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return "";
    }
  };

  if (!user) return null;

  const activeChatData = chats.find((c) => c.id === activeChatId);

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Left sidebar: Chat list */}
      <div className="w-80 flex-shrink-0">
        <ConversationList
          chats={chats}
          activeChatId={activeChatId}
          onSelectChat={setActiveChatId}
          loading={loading}
        />
      </div>

      {/* Right: Messages area */}
      <div className="flex-1 flex flex-col">
        {activeChatData ? (
          <>
            {/* Header */}
            <div className="border-b border-border bg-card p-3">
              <h3 className="font-semibold text-foreground">
                Order #{activeChatData.orderId.slice(0, 8)}
              </h3>
              <p className="text-xs text-muted-foreground">
                {activeChatData.order.user.name} · {activeChatData.order.finalAmount.toLocaleString()} ETB · {activeChatData.order.status}
              </p>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  content={msg.content}
                  isOwn={msg.senderId === user.id}
                  timestamp={formatTime(msg.createdAt)}
                  senderName={msg.sender.name || "User"}
                />
              ))}
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Input */}
            <ChatInput onSend={handleSendMessage} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium mb-1">Select a conversation</p>
              <p className="text-sm">Chats are linked to your orders</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
