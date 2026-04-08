import { ShoppingCart, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useNavigate } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

interface Props {
  product: Tables<"products">;
}

const ProductCard = ({ product }: Props) => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const inStock = product.stock > 0;

  const handleAdd = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    addToCart(product.id);
  };

  return (
    <div className="group bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 animate-fade-in flex flex-col">
      <div className="aspect-square bg-secondary flex items-center justify-center overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <Package className="h-12 w-12 text-muted-foreground/40" />
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-sm text-card-foreground line-clamp-2 mb-1">{product.name}</h3>
        {product.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{product.description}</p>
        )}
        <div className="mt-auto flex items-center justify-between">
          <div>
            <span className="font-bold text-lg text-foreground">{product.price}</span>
            <span className="text-xs text-muted-foreground ml-1">ETB</span>
          </div>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!inStock}
            className={!inStock ? "opacity-50" : ""}
          >
            <ShoppingCart className="h-4 w-4 mr-1" />
            {inStock ? "Add" : "Out"}
          </Button>
        </div>
        {!inStock && (
          <span className="text-xs text-destructive mt-1">Out of stock</span>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
