import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ordersApi, paymentsApi, chatApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, MessageCircle, Send, Package, MapPin, DollarSign, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";

interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
  product: { name: string; description: string | null; imageUrl: string | null };
}

interface Order {
  id: string;
  userId: string;
  totalAmount: number;
  deliveryFee: number;
  finalAmount: number;
  status: string;
  deliveryType: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  items: OrderItem[];
  user?: { name: string; phone: string };
  payment?: {
    id: string;
    status: string;
    checkoutUrl: string | null;
    amount: number;
  };
}

interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string; role: string };
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
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    loadOrder();
  }, [user, orderId]);

  useEffect(() => {
    if (order) {
      loadChat();
      // Auto-create payment session if order is PENDING and has no payment yet
      if (order.status === "PENDING" && !order.payment) {
        createPaymentSession();
      }
    }
  }, [order]);

  const loadOrder = async () => {
    if (!orderId) return;
    try {
      const data = await ordersApi.getById(orderId);

      // Check ownership
      if (data.userId !== user?.id && user?.role !== "ADMIN") {
        toast.error("You don't have access to this order");
        navigate("/cart");
        return;
      }

      setOrder(data);
    } catch {
      toast.error("Order not found");
      navigate("/cart");
      return;
    } finally {
      setLoading(false);
    }
  };

  const loadChat = async () => {
    if (!order) return;
    try {
      const chatData = await chatApi.getChatByOrder(order.id);
      if (chatData) {
        setChat(chatData);
        const msgs = await chatApi.getMessages(chatData.id);
        setMessages(msgs);
      }
    } catch {
      // No chat exists yet for this order
    }
  };

  // Auto-create payment session (silently, no redirect)
  const createPaymentSession = async () => {
    try {
      const result = await paymentsApi.create(order.id);
      // Reload order to get the updated payment data with checkout URL
      const updated = await ordersApi.getById(order.id);
      setOrder(updated);
      return result;
    } catch {
      // Payment may already exist — that's fine
    }
  };

  const handlePay = async () => {
    if (!order) return;
    setProcessingPayment(true);
    try {
      // Ensure payment session exists
      if (!order.payment?.checkoutUrl) {
        await createPaymentSession();
        // Reload order one more time to get the URL
        const updated = await ordersApi.getById(order.id);
        if (updated.payment?.checkoutUrl) {
          window.location.href = updated.payment.checkoutUrl;
          return;
        }
        // Fallback: create and redirect
        const result = await paymentsApi.create(order.id);
        window.location.href = result.paymentUrl;
      } else {
        window.location.href = order.payment.checkoutUrl;
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate payment");
      setProcessingPayment(false);
    }
  };

  const startChat = async () => {
    if (!order) return;
    try {
      const chatData = await chatApi.createChat(order.id);
      setChat(chatData);
      toast.success("Chat created! You can now negotiate with the seller.");
    } catch (err: any) {
      toast.error(err.message || "Failed to start chat");
    }
  };

  const sendMessage = async () => {
    if (!chat || !newMessage.trim() || !user) return;
    setSending(true);

    try {
      const msg = await chatApi.sendMessage(chat.id, newMessage.trim());
      setMessages((prev) => [...prev, msg]);
      setNewMessage("");
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
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
              Placed {format(new Date(order.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge className={cn("text-sm px-3 py-1", statusColors[order.status] || "")}>
              {order.status}
            </Badge>
            {order.payment && order.payment.status === "PENDING" && (
              <Button size="sm" onClick={handlePay} disabled={processingPayment}>
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                {processingPayment ? "Redirecting..." : "Pay Now"}
              </Button>
            )}
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
                {order.items?.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.product?.name || "Unknown Product"}</p>
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
                  <span>{order.totalAmount.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span>{order.deliveryFee.toLocaleString()} ETB</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>{order.finalAmount.toLocaleString()} ETB</span>
                </div>
                {order.payment && (
                  <>
                    <Separator />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Payment Status</span>
                      <Badge
                        className={cn("text-xs", {
                          "bg-yellow-500/20 text-yellow-500": order.payment.status === "PENDING",
                          "bg-green-500/20 text-green-500": order.payment.status === "SUCCESS",
                          "bg-red-500/20 text-red-500": order.payment.status === "FAILED",
                        })}
                      >
                        {order.payment.status}
                      </Badge>
                    </div>
                  </>
                )}
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
                  <Badge variant="outline" className="ml-2">{order.deliveryType}</Badge>
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
                  <div className="bg-muted rounded-lg p-3 text-left space-y-1">
                    <p className="text-xs font-medium">Order Context:</p>
                    <p className="text-xs text-muted-foreground">
                      {order.items?.length} item(s) · {order.finalAmount.toLocaleString()} ETB
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Status: {order.status} · {order.deliveryType}
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
                      <span>{order.finalAmount.toLocaleString()} ETB</span>
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="px-3 py-3" style={{ maxHeight: "calc(100vh - 420px)" }}>
                    {messages.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No messages yet. Start the conversation!
                      </p>
                    )}
                    {messages.map((msg) => {
                      const isOwn = msg.senderId === user?.id;
                      return (
                        <div key={msg.id} className={cn("flex gap-2 mb-3", isOwn ? "flex-row-reverse" : "flex-row")}>
                          <Avatar className="h-7 w-7 flex-shrink-0">
                            <AvatarFallback className={cn("text-xs", isOwn ? "bg-primary text-primary-foreground" : "bg-muted")}>
                              {(msg.sender.name || (isOwn ? "You" : "Seller")).charAt(0)}
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
                              {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
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
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
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
