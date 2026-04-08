import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-accessories.jpg";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden rounded-2xl mx-4 mt-4">
      <div className="absolute inset-0">
        <img src={heroImage} alt="Mobile accessories collection" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 to-foreground/30" />
      </div>
      <div className="relative z-10 px-6 py-16 md:py-24 md:px-12 max-w-xl">
        <span className="inline-block px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-semibold mb-4">
          📍 Bale Robe, Ethiopia
        </span>
        <h1 className="text-3xl md:text-5xl font-extrabold text-background leading-tight mb-4">
          Premium Mobile Accessories
        </h1>
        <p className="text-background/80 text-sm md:text-base mb-6 leading-relaxed">
          Quality phone cases, chargers, earphones and more. Fast delivery across Bale Robe.
        </p>
        <Link to="/#products">
          <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
            Browse Products <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </section>
  );
};

export default HeroSection;
