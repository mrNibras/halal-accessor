import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { productsApi, ordersApi, chatApi, authApi } from "@/lib/api";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Package, ShoppingCart, MessageCircle, Plus, Edit, Trash2, RefreshCw,
  TrendingUp, Users, DollarSign, Clock, ChevronDown, ChevronUp, Send,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

// ─── Types ───
interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  imageUrl: string | null;
  categoryId: string | null;
  createdAt: string;
}

interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
  product: { name: string };
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
  user: { name: string; phone: string };
}

interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string; role: string };
}

interface ChatSummary {
  id: string;
  orderId: string;
  createdAt: string;
  lastMessage: ChatMessage | null;
  order: {
    id: string;
    finalAmount: number;
    status: string;
    user: { name: string; phone: string };
  };
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  // Overview stats
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);

  // Products
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({ name: "", description: "", price: "", stock: "", imageUrl: "" });

  // Orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // Chats
  const [chatThreads, setChatThreads] = useState<ChatSummary[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    if (user.role !== "ADMIN") { navigate("/"); toast.error("Access denied"); return; }
    loadData();
  }, [user]);

  // Socket.io setup for admin chat
  useEffect(() => {
    if (!user || user.role !== "ADMIN") return;
    const token = authApi.getToken();
    const s = io(import.meta.env.VITE_API_URL || "http://localhost:5000", { auth: { token } });

    s.on("message:new", (msg: ChatMessage) => {
      setChatThreads((prev) =>
        prev.map((t) =>
          t.id === msg.chatId ? { ...t, lastMessage: msg } : t
        )
      );
      // If viewing this chat, append message
      if (activeChat === msg.chatId) {
        setChatThreads((prev) =>
          prev.map((t) =>
            t.id === msg.chatId
              ? { ...t, messages: [...(t as any).messages || [], msg] }
              : t
          )
        );
      }
    });

    setSocket(s);
    return () => { s.disconnect(); };
  }, [user]);

  // Join/leave active chat
  useEffect(() => {
    if (!socket || !activeChat) return;
    socket.emit("join:chat", activeChat);
    return () => { socket.emit("leave:chat", activeChat); };
  }, [activeChat, socket]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadStats(), loadProducts(), loadOrders(), loadChats()]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    const allOrders = await ordersApi.getAll();
    const allProducts = await productsApi.getAll();

    setTotalRevenue(
      allOrders
        .filter((o: any) => o.status === "PAID" || o.status === "DELIVERED")
        .reduce((s: number, o: any) => s + (o.finalAmount || 0), 0)
    );
    setTotalOrders(allOrders.length);
    setTotalProducts(allProducts.length);
  };

  const loadProducts = async () => {
    const data = await productsApi.getAll();
    setProducts(data);
  };

  const loadOrders = async () => {
    const data = await ordersApi.getAll();
    setOrders(data);
  };

  const loadChats = async () => {
    const data = await chatApi.getChats();
    setChatThreads(data);
  };

  // ─── Product CRUD ───
  const openProductDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        description: product.description || "",
        price: String(product.price),
        stock: String(product.stock),
        imageUrl: product.imageUrl || "",
      });
    } else {
      setEditingProduct(null);
      setProductForm({ name: "", description: "", price: "", stock: "", imageUrl: "" });
    }
    setShowProductDialog(true);
  };

  const saveProduct = async () => {
    if (!productForm.name || !productForm.price || !productForm.stock) {
      toast.error("Fill all required fields");
      return;
    }
    const data = {
      name: productForm.name,
      description: productForm.description || undefined,
      price: parseInt(productForm.price),
      stock: parseInt(productForm.stock),
      imageUrl: productForm.imageUrl || undefined,
    };

    try {
      if (editingProduct) {
        await productsApi.update(editingProduct.id, data);
        toast.success("Product updated!");
      } else {
        await productsApi.create(data);
        toast.success("Product created!");
      }
      setShowProductDialog(false);
      loadProducts();
    } catch (err: any) {
      toast.error(err.message || "Failed to save product");
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await productsApi.delete(id);
      toast.success("Product deleted");
      loadProducts();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete product");
    }
  };

  // ─── Order Status Update ───
  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await ordersApi.updateStatus(orderId, status);
      toast.success(`Order status updated to ${status}`);
      loadOrders();
      loadStats();
    } catch (err: any) {
      toast.error(err.message || "Failed to update order");
    }
  };

  // ─── Chat ───
  const sendMessage = async () => {
    if (!activeChat || !newMessage.trim() || !socket) return;
    socket.emit("send:message", { chatId: activeChat, content: newMessage.trim() });
    setNewMessage("");
  };

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-500/20 text-yellow-500",
    PAID: "bg-blue-500/20 text-blue-500",
    PROCESSING: "bg-purple-500/20 text-purple-500",
    DELIVERED: "bg-green-500/20 text-green-500",
    CANCELLED: "bg-red-500/20 text-red-500",
  };

  if (!user) return null;
  if (loading) return <div className="min-h-screen flex items-center justify-center"><RefreshCw className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage your store</p>
          </div>
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview"><TrendingUp className="h-4 w-4 mr-2" />Overview</TabsTrigger>
            <TabsTrigger value="products"><Package className="h-4 w-4 mr-2" />Products</TabsTrigger>
            <TabsTrigger value="orders"><ShoppingCart className="h-4 w-4 mr-2" />Orders</TabsTrigger>
            <TabsTrigger value="chats"><MessageCircle className="h-4 w-4 mr-2" />Chats</TabsTrigger>
          </TabsList>

          {/* ─── OVERVIEW ─── */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalRevenue.toLocaleString()} ETB</div>
                  <p className="text-xs text-muted-foreground">From paid orders</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalOrders}</div>
                  <p className="text-xs text-muted-foreground">All time</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Products</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalProducts}</div>
                  <p className="text-xs text-muted-foreground">In catalog</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Active Chats</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{chatThreads.length}</div>
                  <p className="text-xs text-muted-foreground">Conversations</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Orders */}
            <Card>
              <CardHeader><CardTitle>Recent Orders</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {orders.slice(0, 5).map(order => (
                    <div key={order.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="font-medium text-sm">Order #{order.id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">{order.user.name} · {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-sm">{order.finalAmount.toLocaleString()} ETB</span>
                        <Badge className={cn("text-xs", statusColors[order.status] || "")}>{order.status}</Badge>
                      </div>
                    </div>
                  ))}
                  {orders.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No orders yet</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── PRODUCTS ─── */}
          <TabsContent value="products">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Product Catalog</h2>
              <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
                <DialogTrigger asChild>
                  <Button onClick={() => openProductDialog()}><Plus className="h-4 w-4 mr-2" />Add Product</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingProduct ? "Edit Product" : "Add Product"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="Product name" value={productForm.name} onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))} />
                    <Textarea placeholder="Description" value={productForm.description} onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))} />
                    <div className="grid grid-cols-2 gap-3">
                      <Input type="number" placeholder="Price (ETB)" value={productForm.price} onChange={e => setProductForm(p => ({ ...p, price: e.target.value }))} />
                      <Input type="number" placeholder="Stock" value={productForm.stock} onChange={e => setProductForm(p => ({ ...p, stock: e.target.value }))} />
                    </div>
                    <Input placeholder="Image URL (optional)" value={productForm.imageUrl} onChange={e => setProductForm(p => ({ ...p, imageUrl: e.target.value }))} />
                    <Button onClick={saveProduct} className="w-full">{editingProduct ? "Update" : "Create"}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(product => (
                <Card key={product.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-sm line-clamp-1">{product.name}</h3>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openProductDialog(product)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => deleteProduct(product.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{product.description || "No description"}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{product.price.toLocaleString()} ETB</span>
                      <Badge variant={product.stock > 10 ? "default" : product.stock > 0 ? "secondary" : "destructive"} className="text-xs">
                        Stock: {product.stock}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ─── ORDERS ─── */}
          <TabsContent value="orders">
            <h2 className="text-lg font-semibold mb-4">All Orders</h2>
            <div className="space-y-3">
              {orders.map(order => (
                <Card key={order.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)} className="hover:text-primary">
                          {expandedOrder === order.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </button>
                        <div>
                          <p className="font-medium text-sm">Order #{order.id.slice(0, 8)}</p>
                          <p className="text-xs text-muted-foreground">
                            {order.user.name} · {order.user.phone} · {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold">{order.finalAmount.toLocaleString()} ETB</span>
                        <Badge className={cn("text-xs", statusColors[order.status] || "")}>{order.status}</Badge>
                        <Select defaultValue={order.status} onValueChange={(val) => updateOrderStatus(order.id, val)}>
                          <SelectTrigger className="w-36 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="PAID">Paid</SelectItem>
                            <SelectItem value="PROCESSING">Processing</SelectItem>
                            <SelectItem value="DELIVERED">Delivered</SelectItem>
                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {expandedOrder === order.id && (
                      <div className="mt-3 pt-3 border-t border-border space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-muted-foreground">Delivery:</span> <Badge variant="outline" className="ml-1 text-xs">{order.deliveryType}</Badge></div>
                          <div><span className="text-muted-foreground">Subtotal:</span> {order.totalAmount.toLocaleString()} ETB</div>
                          <div><span className="text-muted-foreground">Delivery Fee:</span> {order.deliveryFee.toLocaleString()} ETB</div>
                          <div><span className="text-muted-foreground">Final:</span> <strong>{order.finalAmount.toLocaleString()} ETB</strong></div>
                          {order.latitude && order.longitude && (
                            <div className="col-span-2"><span className="text-muted-foreground">Location:</span> {order.latitude.toFixed(4)}, {order.longitude.toFixed(4)}</div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-1">Items:</p>
                          <div className="space-y-1">
                            {order.items?.map(item => (
                              <div key={item.id} className="flex justify-between text-xs">
                                <span>{item.product.name} × {item.quantity}</span>
                                <span>{(item.price * item.quantity).toLocaleString()} ETB</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {orders.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No orders yet</p>}
            </div>
          </TabsContent>

          {/* ─── CHATS ─── */}
          <TabsContent value="chats">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: "calc(100vh - 250px)" }}>
              {/* Thread list */}
              <Card className="lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2"><MessageSquare className="h-4 w-4" />Conversations</CardTitle>
                </CardHeader>
                <ScrollArea className="flex-1" style={{ maxHeight: "calc(100vh - 320px)" }}>
                  <div className="px-2 space-y-1">
                    {chatThreads.map(thread => (
                      <button
                        key={thread.id}
                        onClick={() => setActiveChat(thread.id)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg transition-colors",
                          activeChat === thread.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs bg-muted">{thread.order.user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{thread.order.user.name}</p>
                            {thread.lastMessage && (
                              <p className="text-xs text-muted-foreground truncate">{thread.lastMessage.content}</p>
                            )}
                          </div>
                          {thread.lastMessage && (
                            <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    ))}
                    {chatThreads.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">No conversations yet</p>
                    )}
                  </div>
                </ScrollArea>
              </Card>

              {/* Chat area */}
              <Card className="lg:col-span-2 flex flex-col">
                {activeChat ? (
                  <>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">
                        Chat with {chatThreads.find(t => t.id === activeChat)?.order.user.name || "Customer"}
                        <span className="text-xs text-muted-foreground ml-2">
                          Order #{chatThreads.find(t => t.id === activeChat)?.orderId.slice(0, 8)}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <ScrollArea className="flex-1 px-4" style={{ maxHeight: "calc(100vh - 380px)" }}>
                      <ChatMessages chatId={activeChat} />
                    </ScrollArea>
                    <div className="border-t border-border p-3 flex gap-2">
                      <Textarea
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        placeholder="Type a reply..."
                        className="resize-none min-h-[40px]"
                        rows={1}
                      />
                      <Button size="icon" onClick={sendMessage} disabled={!newMessage.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Select a conversation to start chatting</p>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Sub-component for displaying messages in admin chat
function ChatMessages({ chatId }: { chatId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { user } = useAuth();
  const endRef = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    chatApi.getMessages(chatId).then(setMessages).catch(() => {});
  }, [chatId]);

  return (
    <div>
      {messages.map(msg => {
        const isOwn = msg.senderId === user?.id;
        return (
          <div key={msg.id} className={cn("flex gap-2 mb-3", isOwn ? "flex-row-reverse" : "flex-row")}>
            <div className={cn("max-w-[75%] rounded-lg px-3 py-2 text-sm break-words",
              isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              <p>{msg.content}</p>
              <p className={cn("text-xs mt-1", isOwn ? "text-primary-foreground/60" : "text-muted-foreground")}>
                {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        );
      })}
      {messages.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-8">No messages yet</p>
      )}
      <div ref={endRef as any} />
    </div>
  );
}

export default AdminDashboard;
