import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  content: string;
  isOwn: boolean;
  timestamp: string;
  senderName: string;
}

const MessageBubble = ({ content, isOwn, timestamp, senderName }: MessageBubbleProps) => {
  return (
    <div className={cn("flex gap-2 mb-4", isOwn ? "flex-row-reverse" : "flex-row")}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className={cn("text-xs font-bold", isOwn ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
          {senderName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className={cn("max-w-[70%] space-y-1", isOwn ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-lg px-3 py-2 text-sm break-words",
            isOwn ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"
          )}
        >
          {content}
        </div>
        <p className="text-xs text-muted-foreground px-1">{timestamp}</p>
      </div>
    </div>
  );
};

export default MessageBubble;
