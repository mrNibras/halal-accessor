import { Link } from "react-router-dom";
import { ShoppingCart, User, LogOut, Menu, X, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useState } from "react";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const { totalItems } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 glass">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">HA</span>
          </div>
          <span className="font-bold text-lg text-foreground">HalalAccessor</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-4">
          <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Products
          </Link>
          <Link to="/cart" className="relative">
            <Button variant="ghost" size="icon">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Button>
          </Link>
          {user && (
            <Link to="/chat">
              <Button variant="ghost" size="icon">
                <MessageCircle className="h-5 w-5" />
              </Button>
            </Link>
          )}
          {user ? (
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-1" /> Sign Out
            </Button>
          ) : (
            <Link to="/auth">
              <Button size="sm">
                <User className="h-4 w-4 mr-1" /> Sign In
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card p-4 space-y-3 animate-fade-in">
          <Link to="/" onClick={() => setMobileOpen(false)} className="block text-sm font-medium">
            Products
          </Link>
          <Link to="/cart" onClick={() => setMobileOpen(false)} className="block text-sm font-medium">
            Cart {totalItems > 0 && `(${totalItems})`}
          </Link>
          {user && (
            <Link to="/chat" onClick={() => setMobileOpen(false)} className="block text-sm font-medium flex items-center gap-2">
              <MessageCircle className="h-4 w-4" /> Chat
            </Link>
          )}
          {user ? (
            <Button variant="ghost" size="sm" onClick={() => { signOut(); setMobileOpen(false); }}>
              <LogOut className="h-4 w-4 mr-1" /> Sign Out
            </Button>
          ) : (
            <Link to="/auth" onClick={() => setMobileOpen(false)}>
              <Button size="sm" className="w-full">
                <User className="h-4 w-4 mr-1" /> Sign In
              </Button>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
