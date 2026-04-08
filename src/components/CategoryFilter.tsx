import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Smartphone, Zap, Headphones, Shield, BatteryCharging, LayoutGrid } from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  smartphone: <Smartphone className="h-4 w-4" />,
  zap: <Zap className="h-4 w-4" />,
  headphones: <Headphones className="h-4 w-4" />,
  shield: <Shield className="h-4 w-4" />,
  "battery-charging": <BatteryCharging className="h-4 w-4" />,
};

interface Props {
  selected: string | null;
  onSelect: (id: string | null) => void;
}

const CategoryFilter = ({ selected, onSelect }: Props) => {
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
      <button
        onClick={() => onSelect(null)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
          selected === null
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
        }`}
      >
        <LayoutGrid className="h-4 w-4" /> All
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            selected === cat.id
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          {iconMap[cat.icon || ""] || <LayoutGrid className="h-4 w-4" />}
          {cat.name}
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;
