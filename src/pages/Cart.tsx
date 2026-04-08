import { Link } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";

const Cart = () => {
  const { items, isLoading, totalPrice, updateQuantity, removeFromCart } = useCart();
  const { user } = useAuth();

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
                  <ShoppingBag className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-card-foreground truncate">
                    {item.products.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {item.products.price} ETB × {item.quantity}
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

            <div className="bg-card rounded-xl border border-border p-6 mt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground">Total</span>
                <span className="text-2xl font-bold text-foreground">{totalPrice} ETB</span>
              </div>
              <Button className="w-full" size="lg">
                Proceed to Checkout
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Delivery fee calculated at checkout
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
