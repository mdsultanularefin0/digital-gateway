import { Link } from "react-router-dom";
import { ArrowRight, ShoppingCart } from "lucide-react";
import { type Product } from "@/data/products";
import { useSiteSettings } from "@/hooks/use-site-settings";

import { useCart } from "@/contexts/CartContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export function ProductCard({ product }: { product: Product }) {
  const { data: settings } = useSiteSettings();
  const currencySymbol = settings?.currency_symbol || "$";
  const { addItem } = useCart();

  const { data: firstImage } = useQuery({
    queryKey: ["product-first-image", product.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_images")
        .select("image_url")
        .eq("product_id", product.id)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data?.image_url || null;
    },
  });

  const { data: defaultTier } = useQuery({
    queryKey: ["product-default-tier", product.id],
    queryFn: async () => {
      // First try to find a tier marked as default
      const { data: allTiers } = await supabase
        .from("product_tiers")
        .select("price, label, sort_order")
        .eq("product_id", product.id)
        .order("sort_order", { ascending: true });
      if (!allTiers || allTiers.length === 0) return null;
      const defTier = (allTiers as any[]).find((t) => t.is_default);
      const chosen = defTier || allTiers[0];
      return { price: Number(chosen.price), label: chosen.label as string };
    },
  });

  const displayPrice = defaultTier ? Number(defaultTier.price) : product.price;

  const toggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (wishlisted) removeFromWishlist(product.id);
    else addToWishlist(product.id);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: product.id,
      productName: product.name,
      tierLabel: "",
      tierId: null,
      price: product.price,
      image: (product as any).image || "",
    });
    toast({ title: `${product.name} added to cart` });
  };

  const inStock = (product as any).inStock !== false;

  return (
    <Link
      to={`/products/${product.slug || product.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl glass-card transition-all duration-300 hover:shadow-card-hover hover:border-primary/30"
    >
      <div className="aspect-video w-full overflow-hidden bg-secondary relative">
        {firstImage ? (
          <img src={firstImage} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="flex h-full items-center justify-center gradient-bg opacity-10 group-hover:opacity-20 transition-opacity duration-500">
            <span className="text-4xl font-display font-bold text-foreground/20">{product.name[0]}</span>
          </div>
        )}
        <button
          onClick={toggleWishlist}
          className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border border-border hover:bg-background transition-colors z-10"
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart className={`h-4 w-4 transition-colors ${wishlisted ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
        </button>
        {!inStock && (
          <span className="absolute top-3 left-3 rounded-xl bg-destructive/90 px-2.5 py-1 text-xs font-semibold text-destructive-foreground backdrop-blur-sm">
            Out of Stock
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center gap-2 mb-3">
          {product.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium tracking-wider uppercase text-primary"
            >
              {tag}
            </span>
          ))}
          {inStock && (
            <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
              In Stock
            </span>
          )}
        </div>

        <h3 className="text-lg font-display font-semibold text-foreground group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{product.tagline}</p>

        <div className="mt-auto flex items-center justify-between pt-4 border-t border-border mt-4">
          <span className="text-lg font-bold text-foreground">
            {currencySymbol}{displayPrice}
          </span>
          <div className="flex items-center gap-2">
            {inStock && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={handleAddToCart}
              >
                <ShoppingCart className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            )}
            <span className="flex items-center gap-1 text-sm text-primary font-medium group-hover:gap-2 transition-all">
              Details <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
