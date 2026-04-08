import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Participant {
  user_id: string;
  profiles: {
    display_name: string | null;
  };
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

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: (participantIds: string[]) => Promise<void>;
  availableUsers: { id: string; display_name: string }[];
}

const ConversationList = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  availableUsers,
}: ConversationListProps) => {
  const { user } = useAuth();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = availableUsers.filter(
    (u) =>
      u.display_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      u.id !== user?.id
  );

  const handleCreate = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Select at least one participant");
      return;
    }
    try {
      await onNewConversation(selectedUsers);
      setSelectedUsers([]);
      setSearchQuery("");
      setShowNewDialog(false);
      toast.success("Conversation created!");
    } catch (err: any) {
      toast.error(err.message || "Failed to create conversation");
    }
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const getOtherParticipants = (conversation: Conversation) => {
    return conversation.participants.filter((p) => p.user_id !== user?.id);
  };

  const getConversationName = (conversation: Conversation) => {
    const others = getOtherParticipants(conversation);
    if (others.length === 0) return "Unknown";
    return others.map((p) => p.profiles.display_name || "User").join(", ");
  };

  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Chats</h2>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowNewDialog(!showNewDialog)}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          New
        </Button>
      </div>

      {showNewDialog && (
        <div className="p-3 border-b border-border bg-muted/50 space-y-3">
          <p className="text-sm font-medium">Select participants:</p>
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <ScrollArea className="h-[150px]">
            <div className="space-y-1">
              {filteredUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => toggleUser(u.id)}
                  className={cn(
                    "w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors",
                    selectedUsers.includes(u.id)
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  )}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {u.display_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {u.display_name}
                </button>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-xs text-muted-foreground p-2">No users found</p>
              )}
            </div>
          </ScrollArea>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} className="flex-1">
              <Users className="h-4 w-4 mr-1" />
              Start Chat
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowNewDialog(false);
                setSelectedUsers([]);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className={cn(
                "w-full text-left p-3 rounded-lg transition-colors space-y-1",
                activeConversationId === conv.id
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted"
              )}
            >
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs font-bold bg-muted">
                    {getConversationName(conv).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {getConversationName(conv)}
                  </p>
                  {conv.lastMessage && (
                    <p className="text-xs text-muted-foreground truncate">
                      {conv.lastMessage.content}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
          {conversations.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs">Start a new chat to begin!</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ConversationList;
