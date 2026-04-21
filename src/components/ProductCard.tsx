import { Link, useNavigate } from "react-router-dom";
import { Zap, ImageIcon } from "lucide-react";
import { type Product } from "@/data/products";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProductTranslator } from "@/hooks/use-product-translation";
import { useCart } from "@/contexts/CartContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useRef } from "react";
import { cn } from "@/lib/utils";

export function ProductCard({ product: rawProduct }: { product: Product }) {
  const { data: settings } = useSiteSettings();
  const currencySymbol = settings?.currency_symbol || "৳";
  const { addItem } = useCart();
  const { t } = useLanguage();
  const { tr } = useProductTranslator();
  const product = tr(rawProduct as any) as Product;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const prefetchedRef = useRef(false);

  const prefetchDetail = () => {
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;
    import("@/pages/ProductDetail").catch(() => {});
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
        .select("price, label, sort_order, is_default")
        .eq("product_id", product.id)
        .order("sort_order", { ascending: true });
      if (!allTiers || allTiers.length === 0) return null;
      const defTier = (allTiers as any[]).find((t) => t.is_default);
      const chosen = defTier || allTiers[0];
      return { price: Number(chosen.price), label: chosen.label as string };
    },
  });

  const displayPrice = defaultTier ? Number(defaultTier.price) : product.price;
  const compareAtPrice = product.compareAtPrice;
  const hasDiscount = compareAtPrice != null && compareAtPrice > displayPrice;
  const discountPct = hasDiscount ? Math.round(((compareAtPrice! - displayPrice) / compareAtPrice!) * 100) : 0;
  const inStock = (product as any).inStock !== false;

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(
      {
        productId: product.id,
        productName: product.name,
        tierLabel: defaultTier?.label || "",
        tierId: null,
        price: displayPrice,
        image: firstImage || (product as any).image || "",
      },
      false
    );
    navigate("/checkout");
  };

  return (
    <Link
      to={`/products/${product.slug || product.id}`}
      onMouseEnter={prefetchDetail}
      onTouchStart={prefetchDetail}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl glass-card p-3 sm:p-6 transition-all duration-300 hover:shadow-card-hover hover:border-primary/30"
    >
      {/* Square image */}
      <div className="aspect-square w-full overflow-hidden rounded-xl bg-secondary relative shrink-0">
        {firstImage ? (
          <img
            src={firstImage}
            alt={product.name || "Product image"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <ImageIcon className="h-7 w-7 text-primary/40" />
            </div>
          </div>
        )}
        {!inStock && (
          <span className="absolute top-3 left-3 rounded-xl bg-destructive/90 px-2.5 py-1 text-xs font-semibold text-destructive-foreground backdrop-blur-sm">
            {t("product.out_of_stock")}
          </span>
        )}
      </div>

      {/* Tag chips */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {product.category && (
          <Badge
            variant="outline"
            className="border-transparent bg-accent/10 text-accent text-[10px] sm:text-xs font-medium normal-case"
          >
            {product.category}
          </Badge>
        )}
        {product.featured && (
          <Badge
            variant="outline"
            className="hidden sm:inline-flex border-transparent bg-primary/10 text-primary text-[10px] sm:text-xs font-medium normal-case"
          >
            {t("product.featured") || "Featured"}
          </Badge>
        )}
      </div>

      {/* Title */}
      <h3 className="mt-2 text-sm sm:text-lg font-display font-semibold text-foreground line-clamp-2 leading-tight group-hover:text-accent transition-colors">
        {product.name}
      </h3>


      {/* Price row (pushed to bottom) */}
      <div className="mt-auto flex items-end justify-between gap-2 pt-3 sm:pt-4">
        <div className="flex flex-col gap-0.5">
          {hasDiscount && (
            <span className="text-xs sm:text-sm text-muted-foreground line-through">
              {currencySymbol}{compareAtPrice}
            </span>
          )}
          <span className="text-base sm:text-xl font-bold text-foreground">
            {currencySymbol}{displayPrice}
          </span>
        </div>
        {hasDiscount && (
          <span className="shrink-0 rounded-xl bg-destructive/90 px-2 py-0.5 text-[11px] sm:text-xs font-bold text-destructive-foreground">
            -{discountPct}%
          </span>
        )}
      </div>

      {/* CTA row */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          className={cn("rounded-xl w-full h-10 text-sm font-semibold")}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
          aria-label={t("action.view_details")}
        >
          {t("action.view_details")}
        </Button>
        {inStock && (
          <Button
            variant="gradient"
            size="sm"
            className="rounded-xl w-full h-10 text-sm font-semibold"
            onClick={handleBuyNow}
            tabIndex={-1}
            aria-label={t("action.buy_now") || "Buy Now"}
          >
            <Zap className="h-4 w-4 mr-1.5" />
            <span>{t("action.buy_now") || "Buy Now"}</span>
          </Button>
        )}
      </div>
    </Link>
  );
}
