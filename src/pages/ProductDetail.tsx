import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, ShoppingCart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";
import { SEOHead } from "@/components/SEOHead";
import { useProductBySlug, faqs } from "@/data/products";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { useCart } from "@/contexts/CartContext";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ProductImageGallery } from "@/components/ProductImageGallery";
import { ReviewForm } from "@/components/ReviewForm";
import { trackViewContent, trackAddToCart } from "@/lib/meta-pixel";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProductTranslator } from "@/hooks/use-product-translation";
import DOMPurify from "dompurify";
import { Skeleton } from "@/components/ui/skeleton";

interface Tier {
  id: string;
  label: string;
  price: number;
  badge: string | null;
  sort_order: number;
}

interface Review {
  id: string;
  customer_name: string;
  rating: number;
  title: string;
  content: string;
  created_at: string;
}

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { data: rawProduct, isLoading } = useProductBySlug(slug ?? "");
  const { t, lang } = useLanguage();
  const { tr } = useProductTranslator();
  const product = rawProduct ? (tr(rawProduct as any) as typeof rawProduct) : rawProduct;
  const [selectedTierIdx, setSelectedTierIdx] = useState(0);
  const { data: settings } = useSiteSettings();
  const currencySymbol = settings?.currency_symbol || "৳";
  const { addItem } = useCart();
  const { user } = useAuth();
  
  const navigate = useNavigate();

  const productId = product?.id;

  const { data: tiers } = useQuery({
    queryKey: ["product-tiers", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_tiers")
        .select("*")
        .eq("product_id", productId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Tier[];
    },
    enabled: !!productId,
  });

  const { data: reviews = [], refetch: refetchReviews } = useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews_public")
        .select("*")
        .eq("product_id", productId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Review[];
    },
    enabled: !!productId,
  });

  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length : 0;

  const hasTiers = tiers && tiers.length > 0;
  const activeTier = hasTiers ? tiers[selectedTierIdx] || tiers[0] : null;
  const baseTierPrice = hasTiers ? tiers[0].price : 0;
  const savings = activeTier && selectedTierIdx > 0 ? baseTierPrice - activeTier.price : 0;


  // Track ViewContent when product loads
  useEffect(() => {
    if (product) {
      trackViewContent({
        content_name: product.name,
        content_ids: [product.id],
        content_type: "product",
        value: activeTier ? activeTier.price : product.price,
        currency: settings?.currency || "USD",
      }, {
        email: user?.email,
        phone: user?.phone || user?.user_metadata?.phone,
        name: user?.user_metadata?.display_name || user?.user_metadata?.full_name,
      });
    }
  }, [product?.id]);

  const handleAddToCart = () => {
    if (!product) return;
    const price = activeTier ? activeTier.price : product.price;
    addItem({
      productId: product.id,
      productName: product.name,
      tierLabel: activeTier?.label || "",
      tierId: activeTier?.id || null,
      price,
      image: product.image,
    });
    trackAddToCart({
      content_name: product.name,
      content_ids: [product.id],
      content_type: "product",
      value: price,
      currency: settings?.currency || "USD",
    }, {
      email: user?.email,
      phone: user?.phone || user?.user_metadata?.phone,
      name: user?.user_metadata?.display_name || user?.user_metadata?.full_name,
    });
    toast({ title: lang === "bn" ? `${product.name} কার্টে যোগ করা হয়েছে` : `${product.name} added to cart` });
  };

  const handleBuyNow = () => {
    if (!product) return;
    const price = activeTier ? activeTier.price : product.price;
    addItem({
      productId: product.id,
      productName: product.name,
      tierLabel: activeTier?.label || "",
      tierId: activeTier?.id || null,
      price,
      image: product.image,
    }, false);
    navigate("/checkout");
  };

  if (isLoading) {
    return (
      <Layout>
        <section className="py-8 sm:py-12 md:py-24">
          <div className="container max-w-6xl">
            <Skeleton className="h-5 w-32 mb-8" />
            <div className="grid gap-8 md:gap-12 md:grid-cols-2">
              <Skeleton className="aspect-square w-full rounded-2xl" />
              <div className="space-y-5">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-5 w-full" />
                <div className="space-y-2 pt-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
                <Skeleton className="h-12 w-40 mt-4" />
                <div className="flex gap-3 pt-4">
                  <Skeleton className="h-12 flex-1 rounded-xl" />
                  <Skeleton className="h-12 flex-1 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="container py-32 text-center">
          <h1 className="text-2xl font-display font-bold">{lang === "bn" ? "পণ্য পাওয়া যায়নি" : "Product not found"}</h1>
          <Button variant="outline-primary" className="mt-4" asChild>
            <Link to="/products">{lang === "bn" ? "পণ্যে ফিরে যান" : "Back to Products"}</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const displayPrice = activeTier ? activeTier.price : product.price;
  const compareAtPrice = !hasTiers ? (product.compareAtPrice ?? null) : null;
  const hasProductDiscount = compareAtPrice != null && compareAtPrice > displayPrice;
  const productDiscountPct = hasProductDiscount
    ? Math.round(((compareAtPrice! - displayPrice) / compareAtPrice!) * 100)
    : 0;

  const siteUrl = window.location.origin;
  const canonicalUrl = `${siteUrl}/products/${product.slug || product.id}`;
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.tagline || product.description,
    image: product.image !== "/placeholder.svg" ? product.image : undefined,
    url: canonicalUrl,
    offers: {
      "@type": "Offer",
      price: displayPrice,
      priceCurrency: settings?.currency || "USD",
      availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    ...(reviews.length > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: avgRating.toFixed(1),
        reviewCount: reviews.length,
      },
    }),
  };

  return (
    <Layout>
      <SEOHead
        title={(product as any).meta_title?.trim() || `${product.name} — GiftCardVibe`}
        description={(product as any).meta_description?.trim() || product.tagline || product.description.slice(0, 155)}
        keywords={(product as any).meta_keywords?.trim() || undefined}
        canonical={canonicalUrl}
        ogImage={(product as any).og_image_url?.trim() || (product.image !== "/placeholder.svg" ? product.image : undefined)}
        type="product"
        jsonLd={productJsonLd}
      />
      <section className="py-8 sm:py-12 md:py-24">
        <div className="container max-w-6xl">
          <Link to="/products" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 sm:mb-8">
            <ArrowLeft className="h-4 w-4" /> {lang === "bn" ? "পণ্যে ফিরে যান" : "Back to Products"}
          </Link>

          <div className="grid gap-6 md:gap-12 lg:grid-cols-2">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="max-w-sm mx-auto w-full lg:max-w-none">
              <ProductImageGallery productId={product.id} fallbackLetter={product.name[0]} />
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex flex-wrap gap-1.5">
                  {product.tags.map((tag) => (
                    <span key={tag} className="rounded-xl bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">{tag}</span>
                  ))}
                </div>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold break-words leading-tight">{product.name}</h1>
              <p className="mt-2 text-base sm:text-lg text-muted-foreground break-words">{product.tagline}</p>

              {/* Rating summary */}
              {reviews.length > 0 && (
                <div className="flex items-center gap-2 mt-3">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className={`h-4 w-4 ${i <= Math.round(avgRating) ? "fill-primary text-primary" : "text-border"}`} />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">{avgRating.toFixed(1)} ({reviews.length} {t("product.reviews").toLowerCase()})</span>
                </div>
              )}

              {/* Features & Benefits inline */}
              {product.features.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium tracking-executive uppercase text-muted-foreground mb-3">{t("product.features")}</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {product.features.map((f) => (
                      <div key={f} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-success shrink-0" />
                        <span className="text-sm">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subscription Selector */}
              <div className="mt-8 sm:mt-10 rounded-xl border border-border p-4 sm:p-6">
                {hasTiers ? (
                  <>
                    <h3 className="text-sm font-medium tracking-executive uppercase text-muted-foreground mb-4">{lang === "bn" ? "প্ল্যান বাছাই করুন" : "Choose Plan"}</h3>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      {tiers.map((tier, i) => (
                        <button
                          key={tier.id}
                          onClick={() => setSelectedTierIdx(i)}
                          className={`relative flex-1 min-w-[90px] rounded-xl border-2 px-3 py-3 text-center transition-all duration-300 ${
                            selectedTierIdx === i
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-foreground/20"
                          }`}
                        >
                          {tier.badge && (
                            <Badge
                              variant="default"
                              className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] px-2 py-0.5 rounded-xl"
                            >
                              {tier.badge}
                            </Badge>
                          )}
                          <span className={`block text-xs sm:text-sm font-medium ${selectedTierIdx === i ? "text-primary" : "text-foreground"}`}>
                            {tier.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <h3 className="text-sm font-medium tracking-executive uppercase text-muted-foreground mb-2">{lang === "bn" ? "মূল্য" : "Pricing"}</h3>
                )}

                <div className="mt-5 sm:mt-6 flex items-baseline gap-2 flex-wrap">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={displayPrice}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                      className="text-3xl sm:text-4xl font-display font-bold"
                    >
                      {currencySymbol}{Number(displayPrice).toFixed(2)}
                    </motion.span>
                  </AnimatePresence>
                  {hasProductDiscount && (
                    <span className="text-lg sm:text-xl text-muted-foreground line-through">
                      {currencySymbol}{Number(compareAtPrice).toFixed(2)}
                    </span>
                  )}
                  {hasProductDiscount && (
                    <span className="rounded-xl bg-destructive/90 px-2.5 py-1 text-xs font-bold text-destructive-foreground">
                      -{productDiscountPct}% OFF
                    </span>
                  )}
                  {activeTier && <span className="text-sm sm:text-base text-muted-foreground">/ {activeTier.label.toLowerCase()}</span>}
                  {!activeTier && product.billingCycle && <span className="text-sm sm:text-base text-muted-foreground">/ {product.billingCycle}</span>}
                </div>

                {savings > 0 && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-success mt-1">
                    {lang === "bn" ? `আপনি সাশ্রয় করছেন ${currencySymbol}${savings.toFixed(2)} (${tiers[0].label} এর তুলনায়)` : `You save ${currencySymbol}${savings.toFixed(2)} compared to ${tiers[0].label}`}
                  </motion.p>
                )}

                <div className="flex flex-row gap-2 sm:gap-3 mt-5 sm:mt-6">
                  <Button variant="outline" size="default" className="flex-1 px-2 sm:px-4 sm:h-12 lg:h-14 text-xs sm:text-sm min-w-0" onClick={handleAddToCart}>
                    <ShoppingCart className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t("action.add_to_cart")}</span>
                  </Button>
                  <Button variant="gradient" size="default" className="flex-1 px-2 sm:px-4 sm:h-12 lg:h-14 text-xs sm:text-sm min-w-0" onClick={handleBuyNow}>
                    <span className="truncate">{t("action.buy_now")}</span>
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Description */}
          <div className="mt-20">
            <h2 className="text-2xl font-display font-bold mb-6">{t("product.description")}</h2>
            <div
              className="prose prose-sm md:prose-base max-w-none text-muted-foreground prose-headings:text-foreground prose-strong:text-foreground prose-ul:text-muted-foreground prose-li:marker:text-primary"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.description) }}
            />
          </div>

          {/* Customer Reviews */}
          <div className="mt-20">
            <h2 className="text-2xl font-display font-bold mb-8">
              {lang === "bn" ? "কাস্টমার রিভিউ" : "Customer Reviews"}
              {reviews.length > 0 && <span className="text-muted-foreground text-lg font-normal ml-2">({reviews.length})</span>}
            </h2>

            {reviews.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 mb-10">
                {reviews.map((r) => (
                  <div key={r.id} className="rounded-xl border border-border bg-card p-6 shadow-card">
                    <div className="flex gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} className={`h-4 w-4 ${i <= (r.rating || 0) ? "fill-primary text-primary" : "text-border"}`} />
                      ))}
                    </div>
                    {r.title && <p className="font-medium text-sm mb-1">{r.title}</p>}
                    <p className="text-sm text-muted-foreground">{r.content}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="font-medium text-sm">{r.customer_name}</span>
                      <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground mb-8">{lang === "bn" ? "এখনো কোনো রিভিউ নেই। প্রথম রিভিউ দিন!" : "No reviews yet. Be the first to review this product!"}</p>
            )}

            <ReviewForm productId={product.id} onSubmitted={() => refetchReviews()} />
          </div>

          <div className="mt-20 max-w-2xl mx-auto">
            <h2 className="text-2xl font-display font-bold mb-8 text-center">{lang === "bn" ? "প্রায়শই জিজ্ঞাসিত প্রশ্ন" : "Frequently Asked Questions"}</h2>
            <Accordion type="single" collapsible className="w-full">
              {faqs.slice(0, 5).map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-sm font-medium">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>
    </Layout>
  );
}
