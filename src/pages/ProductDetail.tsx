import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, ShoppingCart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";
import { useProduct, faqs } from "@/data/products";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { useCart } from "@/contexts/CartContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

interface Tier {
  id: string;
  label: string;
  price: number;
  badge: string | null;
  sort_order: number;
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const { data: product, isLoading } = useProduct(id ?? "");
  const [selectedTierIdx, setSelectedTierIdx] = useState(0);
  const { data: settings } = useSiteSettings();
  const currencySymbol = settings?.currency_symbol || "$";
  const { addItem } = useCart();

  const { data: tiers } = useQuery({
    queryKey: ["product-tiers", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_tiers")
        .select("*")
        .eq("product_id", id!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Tier[];
    },
    enabled: !!id,
  });

  const hasTiers = tiers && tiers.length > 0;
  const activeTier = hasTiers ? tiers[selectedTierIdx] || tiers[0] : null;
  const baseTierPrice = hasTiers ? tiers[0].price : 0;
  const savings = activeTier && selectedTierIdx > 0 ? baseTierPrice - activeTier.price : 0;

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      productId: product.id,
      productName: product.name,
      tierLabel: activeTier?.label || "",
      tierId: activeTier?.id || null,
      price: activeTier ? activeTier.price : product.price,
      image: product.image,
    });
    toast({ title: `${product.name} added to cart` });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-32 text-center text-muted-foreground">Loading...</div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="container py-32 text-center">
          <h1 className="text-2xl font-display font-bold">Product not found</h1>
          <Button variant="outline-primary" className="mt-4" asChild>
            <Link to="/products">Back to Products</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const displayPrice = activeTier ? activeTier.price : product.price;

  return (
    <Layout>
      <section className="py-16 md:py-24">
        <div className="container px-5 md:px-8">
          <Link to="/products" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="h-4 w-4" /> Back to Products
          </Link>

          <div className="grid gap-12 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="aspect-video overflow-hidden rounded-[4px] border border-border bg-muted flex items-center justify-center relative"
            >
              <div className="gradient-bg opacity-10 absolute inset-0" />
              <span className="text-6xl font-display font-bold text-muted-foreground/20">{product.name[0]}</span>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="flex flex-wrap gap-2 mb-4">
                {product.tags.map((tag) => (
                  <span key={tag} className="rounded-[4px] bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{tag}</span>
                ))}
              </div>
              <h1 className="text-3xl font-display font-bold md:text-4xl">{product.name}</h1>
              <p className="mt-2 text-lg text-muted-foreground">{product.tagline}</p>
              <p className="mt-6 text-muted-foreground leading-relaxed">{product.description}</p>

              {/* Subscription Selector */}
              <div className="mt-10 rounded-[4px] border border-border p-6">
                {hasTiers ? (
                  <>
                    <h3 className="text-sm font-medium tracking-executive uppercase text-muted-foreground mb-4">Choose Plan</h3>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      {tiers.map((tier, i) => (
                        <button
                          key={tier.id}
                          onClick={() => setSelectedTierIdx(i)}
                          className={`relative flex-1 rounded-[4px] border-2 px-4 py-3 text-center transition-all duration-300 ${
                            selectedTierIdx === i
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-foreground/20"
                          }`}
                        >
                          {tier.badge && (
                            <Badge
                              variant="default"
                              className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] px-2 py-0.5 rounded-[4px]"
                            >
                              {tier.badge}
                            </Badge>
                          )}
                          <span className={`block text-sm font-medium ${selectedTierIdx === i ? "text-primary" : "text-foreground"}`}>
                            {tier.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <h3 className="text-sm font-medium tracking-executive uppercase text-muted-foreground mb-2">Pricing</h3>
                )}

                <div className="mt-6 flex items-baseline gap-2">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={displayPrice}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                      className="text-4xl font-display font-bold"
                    >
                      {currencySymbol}{Number(displayPrice).toFixed(2)}
                    </motion.span>
                  </AnimatePresence>
                  {activeTier && <span className="text-muted-foreground">/ {activeTier.label.toLowerCase()}</span>}
                  {!activeTier && product.billingCycle && <span className="text-muted-foreground">/ {product.billingCycle}</span>}
                </div>

                {savings > 0 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-success mt-1"
                  >
                    You save {currencySymbol}{savings.toFixed(2)} compared to {tiers[0].label}
                  </motion.p>
                )}

                <Button variant="gradient" size="xl" className="w-full mt-6" onClick={handleAddToCart}>
                  <ShoppingCart className="mr-2 h-4 w-4" /> Add to Cart
                </Button>
              </div>
            </motion.div>
          </div>

          <div className="mt-20">
            <h2 className="text-2xl font-display font-bold mb-8">Features & Benefits</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {product.features.map((f) => (
                <div key={f} className="flex items-center gap-3 rounded-[4px] border border-border bg-card p-4">
                  <Check className="h-5 w-5 text-success shrink-0" />
                  <span className="text-sm">{f}</span>
                </div>
              ))}
            </div>
          </div>

          {product.testimonials.length > 0 && (
            <div className="mt-20">
              <h2 className="text-2xl font-display font-bold mb-8">What customers say</h2>
              <div className="grid gap-6 md:grid-cols-2">
                {product.testimonials.map((t) => (
                  <div key={t.name} className="rounded-[4px] border border-border bg-card p-6 shadow-card">
                    <div className="flex gap-1 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground italic">"{t.quote}"</p>
                    <div className="mt-4">
                      <div className="font-medium text-sm">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-20 max-w-2xl mx-auto">
            <h2 className="text-2xl font-display font-bold mb-8 text-center">Frequently Asked Questions</h2>
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
