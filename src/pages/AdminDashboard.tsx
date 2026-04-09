import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
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
  MessageSquare, Eye
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
  image_url: string | null;
  category_id: string | null;
  is_featured: boolean | null;
  created_at: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  products: { name: string } | null;
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
  profiles: { display_name: string | null; phone: string | null } | null;
}

interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  profiles: { display_name: string | null } | null;
}

interface ChatThread {
  conversation_id: string;
  last_message: string | null;
  last_message_at: string | null;
  customer_name: string;
  customer_id: string;
  messages: ChatMessage[];
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
  const [totalCustomers, setTotalCustomers] = useState(0);

  // Products
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({ name: "", description: "", price: "", stock: "", image_url: "" });

  // Orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // Chats
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadStats(), loadProducts(), loadOrders(), loadChats()]);
    setLoading(false);
  };

  const loadStats = async () => {
    const { data: orders } = await supabase.from("orders").select("final_amount, status");
    const { data: products } = await supabase.from("products").select("id");
    const { data: users } = await supabase.from("profiles").select("user_id");

    setTotalRevenue(orders?.filter(o => o.status === "PAID" || o.status === "DELIVERED").reduce((s, o) => s + (o.final_amount || 0), 0) || 0);
    setTotalOrders(orders?.length || 0);
    setTotalProducts(products?.length || 0);
    setTotalCustomers(users?.length || 0);
  };

  const loadProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    setProducts(data || []);
  };

  const loadOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select(`
        *,
        profiles!orders_user_id_fkey(display_name, phone),
        order_items(
          id, order_id, product_id, quantity, price,
          products!order_items_product_id_fkey(name)
        )
      `)
      .order("created_at", { ascending: false });
    setOrders(data || []);
  };

  const loadChats = async () => {
    // Get all conversations with their latest messages
    const { data: participants } = await supabase
      .from("participants")
      .select(`
        conversation_id,
        user_id,
        profiles!participants_user_id_fkey(display_name)
      `);

    const { data: messages } = await supabase
      .from("messages")
      .select(`
        id, content, sender_id, conversation_id, created_at,
        profiles!messages_sender_id_fkey(display_name)
      `)
      .order("created_at", { ascending: true });

    // Group by conversation
    const threadMap = new Map<string, ChatThread>();
    if (participants) {
      for (const p of participants) {
        if (!threadMap.has(p.conversation_id)) {
          threadMap.set(p.conversation_id, {
            conversation_id: p.conversation_id,
            last_message: null,
            last_message_at: null,
            customer_name: p.profiles?.display_name || "Customer",
            customer_id: p.user_id,
            messages: [],
          });
        }
      }
    }
    if (messages) {
      for (const m of messages) {
        const thread = threadMap.get(m.conversation_id);
        if (thread) {
          thread.messages.push(m);
          thread.last_message = m.content;
          thread.last_message_at = m.created_at;
        }
      }
    }
    setChatThreads(Array.from(threadMap.values()).sort((a, b) =>
      (b.last_message_at || "").localeCompare(a.last_message_at || "")
    ));
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
        image_url: product.image_url || "",
      });
    } else {
      setEditingProduct(null);
      setProductForm({ name: "", description: "", price: "", stock: "", image_url: "" });
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
      description: productForm.description || null,
      price: parseInt(productForm.price),
      stock: parseInt(productForm.stock),
      image_url: productForm.image_url || null,
    };

    if (editingProduct) {
      const { error } = await supabase.from("products").update(data).eq("id", editingProduct.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Product updated!");
    } else {
      const { error } = await supabase.from("products").insert(data);
      if (error) { toast.error(error.message); return; }
      toast.success("Product created!");
    }
    setShowProductDialog(false);
    loadProducts();
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Product deleted");
    loadProducts();
  };

  // ─── Order Status Update ───
  const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
    if (error) { toast.error(error.message); return; }
    toast.success(`Order status updated to ${status}`);
    loadOrders();
    loadStats();
  };

  // ─── Chat ───
  const sendMessage = async () => {
    if (!activeChat || !newMessage.trim() || !user) return;
    const { error } = await supabase.from("messages").insert({
      conversation_id: activeChat,
      sender_id: user.id,
      content: newMessage.trim(),
    });
    if (error) { toast.error(error.message); return; }
    setNewMessage("");
    // Refresh messages
    const { data } = await supabase
      .from("messages")
      .select(`*, profiles!messages_sender_id_fkey(display_name)`)
      .eq("conversation_id", activeChat)
      .order("created_at", { ascending: true });
    setChatThreads(prev => prev.map(t =>
      t.conversation_id === activeChat ? { ...t, messages: data || [], last_message: newMessage.trim(), last_message_at: new Date().toISOString() } : t
    ));
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
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
                  <CardTitle className="text-sm font-medium">Customers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalCustomers}</div>
                  <p className="text-xs text-muted-foreground">Registered users</p>
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
                        <p className="text-xs text-muted-foreground">{order.profiles?.display_name || "Unknown"} · {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-sm">{order.final_amount.toLocaleString()} ETB</span>
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
                    <Input placeholder="Image URL (optional)" value={productForm.image_url} onChange={e => setProductForm(p => ({ ...p, image_url: e.target.value }))} />
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
                            {order.profiles?.display_name || "Unknown"} · {order.profiles?.phone || ""} · {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold">{order.final_amount.toLocaleString()} ETB</span>
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
                          <div><span className="text-muted-foreground">Delivery:</span> <Badge variant="outline" className="ml-1 text-xs">{order.delivery_type}</Badge></div>
                          <div><span className="text-muted-foreground">Subtotal:</span> {order.total_amount.toLocaleString()} ETB</div>
                          <div><span className="text-muted-foreground">Delivery Fee:</span> {order.delivery_fee.toLocaleString()} ETB</div>
                          <div><span className="text-muted-foreground">Final:</span> <strong>{order.final_amount.toLocaleString()} ETB</strong></div>
                          {order.latitude && order.longitude && (
                            <div className="col-span-2"><span className="text-muted-foreground">Location:</span> {order.latitude.toFixed(4)}, {order.longitude.toFixed(4)}</div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-1">Items:</p>
                          <div className="space-y-1">
                            {order.order_items?.map(item => (
                              <div key={item.id} className="flex justify-between text-xs">
                                <span>{item.products?.name || "Unknown"} × {item.quantity}</span>
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
                        key={thread.conversation_id}
                        onClick={() => setActiveChat(thread.conversation_id)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg transition-colors",
                          activeChat === thread.conversation_id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs bg-muted">{thread.customer_name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{thread.customer_name}</p>
                            {thread.last_message && (
                              <p className="text-xs text-muted-foreground truncate">{thread.last_message}</p>
                            )}
                          </div>
                          {thread.last_message_at && (
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
                        Chat with {chatThreads.find(t => t.conversation_id === activeChat)?.customer_name || "Customer"}
                      </CardTitle>
                    </CardHeader>
                    <ScrollArea className="flex-1 px-4" style={{ maxHeight: "calc(100vh - 380px)" }}>
                      {chatThreads.find(t => t.conversation_id === activeChat)?.messages.map(msg => {
                        const isAdmin = msg.sender_id === user?.id;
                        return (
                          <div key={msg.id} className={cn("flex gap-2 mb-3", isAdmin ? "flex-row-reverse" : "flex-row")}>
                            <div className={cn("max-w-[75%] rounded-lg px-3 py-2 text-sm", isAdmin ? "bg-primary text-primary-foreground" : "bg-muted")}>
                              <p>{msg.content}</p>
                              <p className={cn("text-xs mt-1", isAdmin ? "text-primary-foreground/60" : "text-muted-foreground")}>
                                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
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

export default AdminDashboard;
