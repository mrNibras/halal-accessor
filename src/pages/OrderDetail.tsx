import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, MessageCircle, Send, Package, MapPin, Clock, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  products: { name: string; description: string | null; image_url: string | null } | null;
}

interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  delivery_fee: number;
  final_amount: number;
  status: string;
  delivery_type: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  order_items: OrderItem[];
}

interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  conversation_id: string;
  created_at: string;
  profiles: { display_name: string | null } | null;
}

const OrderDetail = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [chat, setChat] = useState<{ id: string } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    loadOrder();
  }, [user, orderId]);

  useEffect(() => {
    if (order) {
      loadChat();
    }
  }, [order]);

  const loadOrder = async () => {
    if (!orderId) return;
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items(
          id, order_id, product_id, quantity, price,
          products!order_items_product_id_fkey(name, description, image_url)
        )
      `)
      .eq("id", orderId)
      .single();

    if (error || !data) {
      toast.error("Order not found");
      navigate("/cart");
      return;
    }

    // Check ownership
    if (data.user_id !== user?.id) {
      toast.error("You don't have access to this order");
      navigate("/cart");
      return;
    }

    setOrder(data);
    setLoading(false);
  };

  const loadChat = async () => {
    if (!order) return;

    // Check if chat exists for this order
    const { data: chatData } = await supabase
      .from("chats")
      .select("id")
      .eq("order_id", order.id)
      .single();

    if (chatData) {
      setChat(chatData);
      // Load messages
      const { data: msgs } = await supabase
        .from("messages")
        .select(`
          id, content, sender_id, conversation_id, created_at,
          profiles!messages_sender_id_fkey(display_name)
        `)
        .eq("conversation_id", chatData.id)
        .order("created_at", { ascending: true });
      setMessages(msgs || []);
    }
  };

  const startChat = async () => {
    if (!order || !user) return;

    try {
      // Create conversation
      const { data: conv, error: convError } = await supabase
        .from("conversations")
        .insert({ created_by: user.id })
        .select("id")
        .single();

      if (convError || !conv) {
        toast.error("Failed to create chat");
        return;
      }

      // Add participants (customer + all admins)
      const { data: admins } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .limit(1);

      // Add customer as participant
      await supabase.from("participants").insert({
        conversation_id: conv.id,
        user_id: user.id,
      });

      // Link chat to order via chats table (or create order-linked reference)
      // Since we use Supabase, we track the order_id in the conversation meta
      // For now, create the chat and store the order reference
      const { error: linkError } = await supabase
        .from("chats")
        .insert({ id: conv.id, order_id: order.id });

      if (linkError) {
        // chats table may not exist in Supabase — use localStorage fallback
        console.warn("Could not link chat to order in DB, using local tracking");
      }

      setChat({ id: conv.id });
      toast.success("Chat created! You can now negotiate with the seller.");
    } catch (err: any) {
      toast.error(err.message || "Failed to start chat");
    }
  };

  const sendMessage = async () => {
    if (!chat || !newMessage.trim() || !user) return;
    setSending(true);

    const { error } = await supabase.from("messages").insert({
      conversation_id: chat.id,
      sender_id: user.id,
      content: newMessage.trim(),
    });

    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    setNewMessage("");

    // Refresh messages
    const { data } = await supabase
      .from("messages")
      .select(`
        id, content, sender_id, conversation_id, created_at,
        profiles!messages_sender_id_fkey(display_name)
      `)
      .eq("conversation_id", chat.id)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-500/20 text-yellow-500",
    PAID: "bg-blue-500/20 text-blue-500",
    PROCESSING: "bg-purple-500/20 text-purple-500",
    DELIVERED: "bg-green-500/20 text-green-500",
    CANCELLED: "bg-red-500/20 text-red-500",
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!order) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/cart")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Order #{order.id.slice(0, 8)}</h1>
            <p className="text-xs text-muted-foreground">
              Placed {format(new Date(order.created_at), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
          <div className="ml-auto">
            <Badge className={cn("text-sm px-3 py-1", statusColors[order.status] || "")}>
              {order.status}
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Order Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" /> Order Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.order_items?.map(item => (
                  <div key={item.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.products?.name || "Unknown Product"}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity} × {item.price.toLocaleString()} ETB</p>
                    </div>
                    <span className="font-semibold text-sm">{(item.price * item.quantity).toLocaleString()} ETB</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pricing Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4" /> Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{order.total_amount.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span>{order.delivery_fee.toLocaleString()} ETB</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>{order.final_amount.toLocaleString()} ETB</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" /> Delivery Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <Badge variant="outline" className="ml-2">{order.delivery_type}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className={cn("ml-2 text-xs", statusColors[order.status] || "")}>{order.status}</Badge>
                </div>
                {order.latitude && order.longitude && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Location:</span>
                    <span className="ml-2 font-mono text-xs">{order.latitude.toFixed(5)}, {order.longitude.toFixed(5)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20" style={{ maxHeight: "calc(100vh - 100px)" }}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageCircle className="h-4 w-4" />
                {chat ? "Chat with Seller" : "Need to Negotiate?"}
              </CardTitle>
              {!chat && (
                <p className="text-xs text-muted-foreground mt-1">
                  Start a conversation about this order to discuss discounts, delivery, or any questions.
                </p>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {!chat ? (
                <div className="p-4 text-center space-y-3">
                  {/* Order context preview */}
                  <div className="bg-muted rounded-lg p-3 text-left space-y-1">
                    <p className="text-xs font-medium">Order Context:</p>
                    <p className="text-xs text-muted-foreground">
                      {order.order_items?.length} item(s) · {order.final_amount.toLocaleString()} ETB
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Status: {order.status} · {order.delivery_type}
                    </p>
                  </div>
                  <Button onClick={startChat} className="w-full">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Chat about this Order
                  </Button>
                </div>
              ) : (
                <>
                  {/* Order context banner */}
                  <div className="px-3 py-2 bg-primary/5 border-b border-border">
                    <div className="flex items-center gap-2 text-xs">
                      <Package className="h-3.5 w-3.5 text-primary" />
                      <span className="text-muted-foreground">Order #{order.id.slice(0, 8)}</span>
                      <span className="text-muted-foreground">·</span>
                      <span>{order.final_amount.toLocaleString()} ETB</span>
                      <span className="text-muted-foreground">·</span>
                      <Badge className={cn("text-xs px-1.5 py-0", statusColors[order.status] || "")}>{order.status}</Badge>
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="px-3 py-3" style={{ maxHeight: "calc(100vh - 420px)" }}>
                    {messages.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No messages yet. Start the conversation!
                      </p>
                    )}
                    {messages.map(msg => {
                      const isOwn = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} className={cn("flex gap-2 mb-3", isOwn ? "flex-row-reverse" : "flex-row")}>
                          <Avatar className="h-7 w-7 flex-shrink-0">
                            <AvatarFallback className={cn("text-xs", isOwn ? "bg-primary text-primary-foreground" : "bg-muted")}>
                              {(msg.profiles?.display_name || (isOwn ? "You" : "Seller")).charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="max-w-[75%]">
                            <div className={cn(
                              "rounded-lg px-3 py-2 text-sm break-words",
                              isOwn ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm"
                            )}>
                              {msg.content}
                            </div>
                            <p className="text-xs text-muted-foreground px-1 mt-0.5">
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="border-t border-border p-3 flex gap-2">
                    <Textarea
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      placeholder="Ask about discounts, delivery..."
                      className="resize-none min-h-[40px]"
                      rows={1}
                      disabled={sending}
                    />
                    <Button size="icon" onClick={sendMessage} disabled={sending || !newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
