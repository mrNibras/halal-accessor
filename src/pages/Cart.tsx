import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, MapPin, Truck, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { ordersApi } from "@/lib/api";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const Cart = () => {
  const { items, isLoading, totalPrice, updateQuantity, removeFromCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checkingOut, setCheckingOut] = useState(false);
  const [deliveryType, setDeliveryType] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Sign in to view your cart</h2>
          <Link to="/auth">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleCheckout = async () => {
    setCheckingOut(true);
    try {
      const order = await ordersApi.create({
        deliveryType,
        ...(deliveryType === "DELIVERY" ? { latitude, longitude } : {}),
      });
      toast.success("Order created successfully!");
      // Redirect to order detail page where user can pay
      navigate(`/orders/${order.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create order");
    } finally {
      setCheckingOut(false);
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          toast.success("Location captured!");
        },
        () => {
          toast.error("Could not get your location. Please enable location access.");
        }
      );
    } else {
      toast.error("Geolocation is not supported by your browser");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Continue Shopping
        </Link>

        <h1 className="text-2xl font-bold text-foreground mb-6">Your Cart</h1>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-secondary rounded-xl animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">Your cart is empty</p>
            <Link to="/" className="mt-4 inline-block">
              <Button variant="outline">Browse Products</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 bg-card rounded-xl border border-border p-4 animate-fade-in"
              >
                <div className="w-16 h-16 bg-secondary rounded-lg flex items-center justify-center shrink-0">
                  {item.product.imageUrl ? (
                    <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <ShoppingBag className="h-6 w-6 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-card-foreground truncate">
                    {item.product.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {item.product.price.toLocaleString()} ETB × {item.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeFromCart(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Delivery options */}
            <div className="bg-card rounded-xl border border-border p-6 mt-6 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Delivery Options</h2>
              <RadioGroup value={deliveryType} onValueChange={(v) => setDeliveryType(v as "PICKUP" | "DELIVERY")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="PICKUP" id="pickup" />
                  <Label htmlFor="pickup" className="flex items-center gap-2 cursor-pointer">
                    <Store className="h-4 w-4" /> Pick up in store (Bale Robe) — Free
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="DELIVERY" id="delivery" />
                  <Label htmlFor="delivery" className="flex items-center gap-2 cursor-pointer">
                    <Truck className="h-4 w-4" /> Delivery — fee calculated based on distance
                  </Label>
                </div>
              </RadioGroup>

              {deliveryType === "DELIVERY" && (
                <div className="space-y-2">
                  <Button variant="outline" onClick={handleGetLocation} className="w-full">
                    <MapPin className="h-4 w-4 mr-2" /> Use My Current Location
                  </Button>
                  {latitude && longitude && (
                    <p className="text-xs text-muted-foreground">
                      Location: {latitude.toFixed(5)}, {longitude.toFixed(5)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Checkout */}
            <div className="bg-card rounded-xl border border-border p-6 mt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-2xl font-bold text-foreground">{totalPrice.toLocaleString()} ETB</span>
              </div>
              <Button className="w-full" size="lg" onClick={handleCheckout} disabled={checkingOut}>
                {checkingOut ? "Processing..." : "Proceed to Checkout"}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                {deliveryType === "DELIVERY" ? "Delivery fee will be added at checkout" : "Pay via Chapa after checkout"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
