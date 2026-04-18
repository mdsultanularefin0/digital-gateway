import { Link } from "react-router-dom";
import { ArrowRight, ShoppingCart } from "lucide-react";
import { type Product } from "@/data/products";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProductTranslator } from "@/hooks/use-product-translation";

import { useCart } from "@/contexts/CartContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useRef } from "react";

export function ProductCard({ product: rawProduct }: { product: Product }) {
  const { data: settings } = useSiteSettings();
  const currencySymbol = settings?.currency_symbol || "৳";
  const { addItem } = useCart();
  const { t } = useLanguage();
  const { tr } = useProductTranslator();
  const product = tr(rawProduct as any) as Product;
  const queryClient = useQueryClient();
  const prefetchedRef = useRef(false);

  const prefetchDetail = () => {
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;
    // Warm the lazy chunk
    import("@/pages/ProductDetail").catch(() => {});
    // Warm key data queries used by ProductDetail
    const slugOrId = product.slug || product.id;
    queryClient.prefetchQuery({
      queryKey: ["product-detail", slugOrId],
      queryFn: async () => {
        const { data } = await supabase
          .from("products")
          .select("*")
          .or(`slug.eq.${slugOrId},id.eq.${product.id}`)
          .maybeSingle();
        return data;
      },
    });
  };

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
      onMouseEnter={prefetchDetail}
      onTouchStart={prefetchDetail}
      className="group relative flex flex-col overflow-hidden rounded-2xl glass-card transition-all duration-300 hover:shadow-card-hover hover:border-primary/30 h-full"
    >
      {/* Fixed aspect ratio image */}
      <div className="aspect-square w-full overflow-hidden bg-secondary relative shrink-0">
        {firstImage ? (
          <img src={firstImage} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center gradient-bg opacity-10 group-hover:opacity-20 transition-opacity duration-500">
            <span className="text-4xl font-display font-bold text-foreground/20">{product.name[0]}</span>
          </div>
        )}
        {!inStock && (
          <span className="absolute top-3 left-3 rounded-xl bg-destructive/90 px-2.5 py-1 text-xs font-semibold text-destructive-foreground backdrop-blur-sm">
            {t("product.out_of_stock")}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-6">
        <h3 className="text-sm sm:text-xl font-display font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight min-h-[2.5rem] sm:min-h-[3.5rem]">
          {product.name}
        </h3>
        <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground line-clamp-2 hidden sm:block">{product.tagline}</p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-3 sm:pt-4 border-t border-border mt-3 sm:mt-4">
          <span className="text-sm sm:text-xl font-bold text-foreground shrink-0">
            {currencySymbol}{displayPrice}
          </span>
          <div className="flex items-center gap-1.5 min-w-0">
            {inStock && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
                onClick={handleAddToCart}
                aria-label={t("action.add_to_cart")}
              >
                <ShoppingCart className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">{t("action.add_to_cart")}</span>
              </Button>
            )}
            <span className="hidden lg:flex items-center gap-1 text-sm text-primary font-medium group-hover:gap-2 transition-all">
              {t("action.view_details")} <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
