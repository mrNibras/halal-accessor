import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import MessageBubble from "@/components/chat/MessageBubble";
import ChatInput from "@/components/chat/ChatInput";
import ConversationList from "@/components/chat/ConversationList";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { RealtimeChannel } from "@supabase/supabase-js";

interface Profile {
  display_name: string | null;
}

interface Participant {
  user_id: string;
  profiles: Profile;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  conversation_id: string;
  created_at: string;
  profiles: Profile;
}

interface Conversation {
  id: string;
  created_at: string;
  participants: Participant[];
  lastMessage?: {
    content: string;
    created_at: string;
  };
}

const Chat = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [availableUsers, setAvailableUsers] = useState<{ id: string; display_name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  const activeConversationChannelRef = useRef<RealtimeChannel | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  // Fetch available users (for creating new conversations)
  const fetchAvailableUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .neq("user_id", user?.id)
      .order("display_name");

    if (error) {
      console.error("Error fetching users:", error);
      return;
    }

    setAvailableUsers(
      data.map((p) => ({ id: p.user_id, display_name: p.display_name || "User" }))
    );
  }, [user?.id]);

  // Fetch conversations with participants and last message
  const fetchConversations = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("participants")
      .select(`
        conversation_id,
        conversations (
          id,
          created_at,
          participants (
            user_id,
            profiles:profiles!participants_user_id_fkey (
              display_name
            )
          )
        )
      `)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching conversations:", error);
      return;
    }

    // Extract unique conversation IDs
    const convMap = new Map<string, Conversation>();

    for (const row of data) {
      const convId = row.conversation_id;
      const conv = row.conversations as any;
      if (!convMap.has(convId)) {
        convMap.set(convId, {
          id: conv.id,
          created_at: conv.created_at,
          participants: conv.participants,
        });
      }
    }

    // Fetch last message for each conversation
    const convIds = Array.from(convMap.keys());
    if (convIds.length > 0) {
      const { data: lastMessages } = await supabase
        .from("messages")
        .select("conversation_id, content, created_at")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false })
        .limit(convIds.length * 1);

      // Deduplicate: get the latest message per conversation
      const latestMap = new Map<string, { content: string; created_at: string }>();
      if (lastMessages) {
        for (const msg of lastMessages) {
          if (!latestMap.has(msg.conversation_id)) {
            latestMap.set(msg.conversation_id, {
              content: msg.content,
              created_at: msg.created_at,
            });
          }
        }
      }

      // Attach last messages
      convMap.forEach((conv) => {
        const lastMsg = latestMap.get(conv.id);
        if (lastMsg) conv.lastMessage = lastMsg;
      });
    }

    setConversations(Array.from(convMap.values()));
    setLoading(false);
  }, [user]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select(`
        id,
        content,
        sender_id,
        conversation_id,
        created_at,
        profiles:profiles!messages_sender_id_fkey (
          display_name
        )
      `)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
      return;
    }

    setMessages(data || []);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, []);

  // Set up realtime subscription for new messages in active conversation
  const subscribeToConversation = useCallback(
    (conversationId: string) => {
      // Unsubscribe from previous
      if (activeConversationChannelRef.current) {
        supabase.removeChannel(activeConversationChannelRef.current);
      }

      const channel = supabase
        .channel(`messages:${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          async (payload) => {
            const newMsg = payload.new as any;

            // Fetch sender profile
            const { data: profile } = await supabase
              .from("profiles")
              .select("display_name")
              .eq("user_id", newMsg.sender_id)
              .single();

            const messageWithProfile: Message = {
              ...newMsg,
              profiles: { display_name: profile?.display_name || "User" },
            };

            setMessages((prev) => [...prev, messageWithProfile]);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

            // Update conversation's last message
            setConversations((prev) =>
              prev.map((conv) =>
                conv.id === conversationId
                  ? { ...conv, lastMessage: { content: newMsg.content, created_at: newMsg.created_at } }
                  : conv
              )
            );
          }
        )
        .subscribe();

      activeConversationChannelRef.current = channel;
    },
    []
  );

  // Set up global realtime subscription for new conversations
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("global-chat-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "participants",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
      if (activeConversationChannelRef.current) {
        supabase.removeChannel(activeConversationChannelRef.current);
      }
    };
  }, [user, fetchConversations]);

  // Load data on mount
  useEffect(() => {
    if (!user) return;
    fetchAvailableUsers();
    fetchConversations();
  }, [user, fetchAvailableUsers, fetchConversations]);

  // When active conversation changes
  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);
      subscribeToConversation(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId, fetchMessages, subscribeToConversation]);

  // Send a message
  const handleSendMessage = async (content: string) => {
    if (!activeConversationId || !user) return;

    const { error } = await supabase.from("messages").insert({
      conversation_id: activeConversationId,
      sender_id: user.id,
      content,
    });

    if (error) {
      toast.error("Failed to send message");
      console.error("Send error:", error);
    }
  };

  // Create a new conversation
  const handleNewConversation = async (participantIds: string[]) => {
    if (!user) return;

    // Create conversation
    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .insert({ created_by: user.id })
      .select("id")
      .single();

    if (convError || !conv) {
      toast.error("Failed to create conversation");
      console.error(convError);
      return;
    }

    // Add all participants (including creator)
    const allParticipantIds = [user.id, ...participantIds];
    const participantRows = allParticipantIds.map((uid) => ({
      conversation_id: conv.id,
      user_id: uid,
    }));

    const { error: partError } = await supabase
      .from("participants")
      .insert(participantRows);

    if (partError) {
      toast.error("Failed to add participants");
      console.error(partError);
      return;
    }

    // Refresh and select
    await fetchConversations();
    setActiveConversationId(conv.id);
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

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Left sidebar: Conversation list */}
      <div className="w-80 flex-shrink-0">
        <ConversationList
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={setActiveConversationId}
          onNewConversation={handleNewConversation}
          availableUsers={availableUsers}
        />
      </div>

      {/* Right: Messages area */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="border-b border-border bg-card p-3">
              <h3 className="font-semibold text-foreground">
                {activeConversation.participants
                  .filter((p) => p.user_id !== user.id)
                  .map((p) => p.profiles.display_name || "User")
                  .join(", ")}
              </h3>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  content={msg.content}
                  isOwn={msg.sender_id === user.id}
                  timestamp={formatTime(msg.created_at)}
                  senderName={msg.profiles.display_name || "User"}
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
              <p className="text-sm">or start a new one to begin chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
