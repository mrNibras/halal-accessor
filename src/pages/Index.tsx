import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ProductGrid from "@/components/ProductGrid";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <ProductGrid />
      <footer className="border-t border-border py-8 mt-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 HalalAccessor — Bale Robe, Ethiopia</p>
          <p className="mt-1">Quality mobile accessories, delivered to your door.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
