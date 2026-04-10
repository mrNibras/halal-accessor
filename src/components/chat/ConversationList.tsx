import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ChatSummary {
  id: string;
  orderId: string;
  createdAt: string;
  lastMessage: {
    content: string;
    createdAt: string;
  } | null;
  order: {
    id: string;
    finalAmount: number;
    status: string;
    user: { name: string; phone: string };
  };
}

interface ConversationListProps {
  chats: ChatSummary[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  loading: boolean;
}

const ConversationList = ({
  chats,
  activeChatId,
  onSelectChat,
  loading,
}: ConversationListProps) => {
  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      <div className="p-3 border-b border-border">
        <h2 className="font-semibold text-foreground">Chats</h2>
        <p className="text-xs text-muted-foreground">Linked to your orders</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Loading...</p>
            </div>
          ) : chats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs">Create an order to start chatting</p>
            </div>
          ) : (
            chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-colors space-y-1",
                  activeChatId === chat.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs font-bold bg-muted">
                      {chat.order.user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {chat.order.user.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      Order #{chat.orderId.slice(0, 8)} · {chat.order.finalAmount.toLocaleString()} ETB
                    </p>
                    {chat.lastMessage && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {chat.lastMessage.content}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ConversationList;
