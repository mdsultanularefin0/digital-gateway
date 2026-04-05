import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, ArrowRight, CheckCircle, Star, HelpCircle, BarChart3, Shield, Gift, Zap, Package, Clock, Loader2, ShoppingBag } from "lucide-react";
import { Layout } from "@/components/Layout";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { landingTemplates, type SectionsData, type SectionContent } from "@/data/landing-templates";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { toast } from "@/hooks/use-toast";

type Lang = "en" | "bn";

const scrollToCheckout = () => {
  document.getElementById("checkout")?.scrollIntoView({ behavior: "smooth" });
};

function CtaButton({ content, className }: { content: SectionContent; className?: string }) {
  if (!content.buttonText) return null;
  const url = content.buttonUrl;
  const isExternal = url && url !== "#" && !url.startsWith("#") && url.startsWith("http");
  if (isExternal) {
    return (
      <Button size="xl" variant="gradient" asChild className={className}>
        <a href={url} target="_blank" rel="noopener noreferrer">{content.buttonText} <ArrowRight className="ml-2 h-5 w-5" /></a>
      </Button>
    );
  }
  return (
    <Button size="xl" variant="gradient" onClick={scrollToCheckout} className={className}>
      {content.buttonText} <ArrowRight className="ml-2 h-5 w-5" />
    </Button>
  );
}

function LanguagePopup({ onSelect }: { onSelect: (lang: Lang) => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-8 shadow-xl max-w-sm w-full mx-4 text-center"
        >
          <Globe className="h-10 w-10 mx-auto text-primary mb-4" />
          <h2 className="text-xl font-display font-bold mb-1">Choose Your Language</h2>
          <p className="text-sm text-muted-foreground mb-6">আপনার ভাষা নির্বাচন করুন</p>
          <div className="grid gap-3">
            <button
              onClick={() => onSelect("en")}
              className="w-full rounded-xl border-2 border-border hover:border-primary p-4 transition-colors text-left flex items-center gap-3 group"
            >
              <span className="text-2xl">🇺🇸</span>
              <div>
                <span className="font-semibold group-hover:text-primary transition-colors">English</span>
                <p className="text-xs text-muted-foreground">Continue in English</p>
              </div>
            </button>
            <button
              onClick={() => onSelect("bn")}
              className="w-full rounded-xl border-2 border-border hover:border-primary p-4 transition-colors text-left flex items-center gap-3 group"
            >
              <span className="text-2xl">🇧🇩</span>
              <div>
                <span className="font-semibold group-hover:text-primary transition-colors">বাংলা</span>
                <p className="text-xs text-muted-foreground">বাংলায় চালিয়ে যান</p>
              </div>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function HeroSection({ content }: { content: SectionContent }) {
  if (!content.heading) return null;
  return (
    <section className="py-20 md:py-32">
      <div className="container max-w-6xl mx-auto px-4">
        <div className={`flex flex-col ${content.imageUrl ? "md:flex-row md:items-center gap-12" : "items-center text-center"}`}>
          <div className="flex-1 space-y-6">
            {content.badge && (
              <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="inline-block rounded-full bg-primary/10 text-primary px-4 py-1.5 text-sm font-medium">
                {content.badge}
              </motion.span>
            )}
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-6xl font-display font-bold leading-tight">
              {content.heading}
            </motion.h1>
            {content.subheading && (
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-lg md:text-xl text-muted-foreground max-w-xl">
                {content.subheading}
              </motion.p>
            )}
            {content.body && (
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-muted-foreground">
                {content.body}
              </motion.p>
            )}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <CtaButton content={content} />
              {content.price && (
                <p className="text-sm text-muted-foreground mt-3">
                  {content.originalPrice && <span className="line-through mr-2">{content.originalPrice}</span>}
                  <span className="font-bold text-foreground text-lg">{content.price}</span>
                </p>
              )}
            </motion.div>
          </div>
          {content.imageUrl && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="flex-1">
              <img src={content.imageUrl} alt="" className="rounded-2xl shadow-xl w-full" />
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}

function ProductShowcaseSection({ content }: { content: SectionContent }) {
  if (!content.heading && !content.imageUrl) return null;
  return (
    <section className="py-16">
      <div className="container max-w-5xl mx-auto px-4 text-center">
        {content.heading && <h2 className="text-3xl font-display font-bold mb-3">{content.heading}</h2>}
        {content.subheading && <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">{content.subheading}</p>}
        {content.imageUrl && (
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <img src={content.imageUrl} alt="" className="rounded-2xl shadow-2xl mx-auto border border-border max-w-full" />
          </motion.div>
        )}
        {content.body && <p className="text-muted-foreground mt-6 max-w-2xl mx-auto">{content.body}</p>}
      </div>
    </section>
  );
}

function FeaturesSection({ content }: { content: SectionContent }) {
  if (!content.items?.length) return null;
  return (
    <section className="py-16 bg-muted/30">
      <div className="container max-w-6xl mx-auto px-4">
        {content.heading && <h2 className="text-3xl font-display font-bold text-center mb-3">{content.heading}</h2>}
        {content.subheading && <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">{content.subheading}</p>}
        <div className="grid gap-6 md:grid-cols-3">
          {content.items.filter(i => i.title).map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="rounded-xl border border-border bg-card p-6">
              <CheckCircle className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection({ content }: { content: SectionContent }) {
  if (!content.items?.length) return null;
  return (
    <section className="py-16">
      <div className="container max-w-5xl mx-auto px-4">
        {content.heading && <h2 className="text-3xl font-display font-bold text-center mb-3">{content.heading}</h2>}
        {content.subheading && <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">{content.subheading}</p>}
        <div className="grid gap-8 md:grid-cols-3">
          {content.items.filter(i => i.title).map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }} className="text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold mb-4">{i + 1}</div>
              <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection({ content }: { content: SectionContent }) {
  if (!content.heading) return null;
  return (
    <section className="py-20">
      <div className="container max-w-3xl mx-auto px-4 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-2xl border-2 border-primary/30 bg-card p-10 relative overflow-hidden">
          {content.badge && (
            <span className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-bl-xl">{content.badge}</span>
          )}
          <h2 className="text-3xl font-display font-bold mb-2">{content.heading}</h2>
          {content.subheading && <p className="text-muted-foreground mb-6">{content.subheading}</p>}
          {content.price && (
            <div className="mb-6">
              {content.originalPrice && <span className="text-2xl text-muted-foreground line-through mr-3">{content.originalPrice}</span>}
              <span className="text-5xl font-bold text-foreground">{content.price}</span>
            </div>
          )}
          {content.items && content.items.filter(i => i.title).length > 0 && (
            <ul className="text-left max-w-md mx-auto mb-8 space-y-3">
              {content.items.filter(i => i.title).map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">{item.title}</span>
                    {item.description && <span className="text-muted-foreground"> — {item.description}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <CtaButton content={content} />
          {content.body && <p className="text-xs text-muted-foreground mt-4">{content.body}</p>}
        </motion.div>
      </div>
    </section>
  );
}

function GuaranteeSection({ content }: { content: SectionContent }) {
  if (!content.heading) return null;
  return (
    <section className="py-16">
      <div className="container max-w-3xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-2xl border border-border bg-card p-8 md:p-12 text-center">
          <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-display font-bold mb-3">{content.heading}</h2>
          {content.subheading && <p className="text-lg text-muted-foreground mb-2">{content.subheading}</p>}
          {content.body && <p className="text-muted-foreground max-w-xl mx-auto">{content.body}</p>}
        </motion.div>
      </div>
    </section>
  );
}

function BonusSection({ content }: { content: SectionContent }) {
  if (!content.items?.length && !content.heading) return null;
  return (
    <section className="py-16 bg-primary/5">
      <div className="container max-w-5xl mx-auto px-4">
        {content.heading && (
          <div className="text-center mb-10">
            <Gift className="h-8 w-8 text-primary mx-auto mb-3" />
            <h2 className="text-3xl font-display font-bold">{content.heading}</h2>
            {content.subheading && <p className="text-muted-foreground mt-2">{content.subheading}</p>}
          </div>
        )}
        {content.items && (
          <div className="grid gap-4 md:grid-cols-2">
            {content.items.filter(i => i.title).map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="flex items-start gap-4 rounded-xl border border-border bg-card p-5">
                <Gift className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CTASection({ content }: { content: SectionContent }) {
  if (!content.heading) return null;
  return (
    <section className="py-20">
      <div className="container max-w-3xl mx-auto px-4 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-12">
          <h2 className="text-3xl font-display font-bold mb-3">{content.heading}</h2>
          {content.subheading && <p className="text-muted-foreground mb-6">{content.subheading}</p>}
          <CtaButton content={content} />
          {content.price && (
            <p className="text-sm text-muted-foreground mt-4">
              {content.originalPrice && <span className="line-through mr-2">{content.originalPrice}</span>}
              <span className="font-bold text-foreground">{content.price}</span>
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
}

function TestimonialSection({ content }: { content: SectionContent }) {
  if (!content.heading && !content.body && !content.items?.length) return null;
  return (
    <section className="py-16">
      <div className="container max-w-5xl mx-auto px-4">
        {content.heading && <h2 className="text-3xl font-display font-bold text-center mb-8">{content.heading}</h2>}
        {content.body && !content.items?.length && (
          <blockquote className="text-xl italic text-muted-foreground max-w-2xl mx-auto text-center relative">
            <Star className="h-6 w-6 text-primary mx-auto mb-4" />
            "{content.body}"
            {content.subheading && <cite className="block text-sm mt-4 not-italic font-medium text-foreground">— {content.subheading}</cite>}
          </blockquote>
        )}
        {content.items && content.items.filter(i => i.title).length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {content.items.filter(i => i.title).map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="rounded-xl border border-border bg-card p-5">
                <div className="flex gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground italic mb-3">"{item.description}"</p>
                <p className="text-sm font-medium">— {item.title}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function StatsSection({ content }: { content: SectionContent }) {
  if (!content.items?.length) return null;
  return (
    <section className="py-16 bg-muted/30">
      <div className="container max-w-5xl mx-auto px-4">
        {content.heading && <h2 className="text-3xl font-display font-bold text-center mb-10">{content.heading}</h2>}
        <div className="grid gap-6 md:grid-cols-3">
          {content.items.filter(i => i.title).map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center p-6">
              <BarChart3 className="h-6 w-6 text-primary mx-auto mb-2" />
              <div className="text-3xl font-bold">{item.title}</div>
              <div className="text-sm text-muted-foreground mt-1">{item.description}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection({ content }: { content: SectionContent }) {
  if (!content.items?.length) return null;
  return (
    <section className="py-16">
      <div className="container max-w-3xl mx-auto px-4">
        {content.heading && <h2 className="text-3xl font-display font-bold text-center mb-10">{content.heading}</h2>}
        <div className="space-y-4">
          {content.items.filter(i => i.title).map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="rounded-xl border border-border p-5">
              <div className="flex gap-3">
                <HelpCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CountdownSection({ content }: { content: SectionContent }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!content.countdownDate) return;
    const target = new Date(content.countdownDate).getTime();
    const tick = () => {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) { setExpired(true); return; }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [content.countdownDate]);

  if (!content.heading && !content.countdownDate) return null;

  const units = [
    { label: "Days", value: timeLeft.days },
    { label: "Hours", value: timeLeft.hours },
    { label: "Minutes", value: timeLeft.minutes },
    { label: "Seconds", value: timeLeft.seconds },
  ];

  return (
    <section className="py-20">
      <div className="container max-w-4xl mx-auto px-4 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-10 md:p-14">
          {content.badge && (
            <span className="inline-block rounded-full bg-destructive/10 text-destructive px-4 py-1.5 text-sm font-bold mb-4 animate-pulse">{content.badge}</span>
          )}
          <Clock className="h-10 w-10 text-primary mx-auto mb-4" />
          {content.heading && <h2 className="text-3xl md:text-4xl font-display font-bold mb-2">{content.heading}</h2>}
          {content.subheading && <p className="text-muted-foreground mb-8 max-w-xl mx-auto">{content.subheading}</p>}
          {content.countdownDate && !expired && (
            <div className="flex justify-center gap-3 md:gap-6 mb-8">
              {units.map((u) => (
                <div key={u.label} className="flex flex-col items-center">
                  <motion.span key={u.value} initial={{ scale: 1.1 }} animate={{ scale: 1 }} className="text-4xl md:text-5xl font-bold bg-card border border-border rounded-xl w-16 md:w-20 h-16 md:h-20 flex items-center justify-center shadow-lg">
                    {String(u.value).padStart(2, "0")}
                  </motion.span>
                  <span className="text-xs text-muted-foreground mt-2 uppercase tracking-wider">{u.label}</span>
                </div>
              ))}
            </div>
          )}
          {expired && content.countdownDate && (
            <p className="text-lg font-semibold text-destructive mb-6">⏰ Offer has ended!</p>
          )}
          {content.price && (
            <div className="mb-6">
              {content.originalPrice && <span className="text-xl text-muted-foreground line-through mr-3">{content.originalPrice}</span>}
              <span className="text-4xl font-bold text-foreground">{content.price}</span>
            </div>
          )}
          <CtaButton content={content} />
          {content.body && <p className="text-xs text-muted-foreground mt-4">{content.body}</p>}
        </motion.div>
      </div>
    </section>
  );
}

function TextImageSection({ content }: { content: SectionContent }) {
  if (!content.heading) return null;
  return (
    <section className="py-16">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center gap-12">
          {content.imageUrl && (
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="flex-1">
              <img src={content.imageUrl} alt="" className="rounded-2xl shadow-lg w-full" />
            </motion.div>
          )}
          <div className="flex-1 space-y-4">
            <h2 className="text-3xl font-display font-bold">{content.heading}</h2>
            {content.subheading && <p className="text-lg text-muted-foreground">{content.subheading}</p>}
            {content.body && <p className="text-muted-foreground">{content.body}</p>}
            {content.buttonText && (
              <Button variant="outline" onClick={scrollToCheckout}>
                {content.buttonText}
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Embedded Checkout Section ───────────────────────────────────────

const ALL_PAYMENT_METHODS = [
  { value: "cod", label: "Cash on Delivery" },
  { value: "bkash", label: "bKash" },
  { value: "nagad", label: "Nagad" },
  { value: "bank", label: "Bank Transfer" },
  { value: "stripe", label: "Credit/Debit Card" },
];

interface CheckoutForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  couponCode: string;
  notes: string;
  paymentMethod: string;
}

const emptyCheckoutForm: CheckoutForm = {
  name: "", email: "", phone: "", address: "", couponCode: "", notes: "", paymentMethod: "",
};

function LandingCheckoutSection({ content, allSections, pageTitle, linkedProduct }: { content: SectionContent; allSections: SectionsData; pageTitle: string; linkedProduct?: { id: string; name: string; price: number; image: string; slug: string } | null }) {
  const { data: settings } = useSiteSettings();
  const sym = settings?.currency_symbol || "$";

  const [form, setForm] = useState<CheckoutForm>(emptyCheckoutForm);
  const [discount, setDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<string | null>(null);

  // Use linked product data if available, otherwise fall back to pricing section
  const pricingSection = allSections?.pricing;
  const productName = linkedProduct?.name || pricingSection?.heading || content?.productName || pageTitle;
  const unitPrice = linkedProduct?.price ?? (parseFloat((pricingSection?.price || content?.price || "0").replace(/[^0-9.]/g, "")) || 0);
  const productImage = linkedProduct?.image || pricingSection?.imageUrl || allSections?.hero?.imageUrl || allSections?.["product-showcase"]?.imageUrl || "";
  const linkedProductId = linkedProduct?.id || null;

  const total = unitPrice - discount;

  // Parse enabled payment methods
  const enabledMethods = (() => {
    try {
      const raw = settings?.payment_methods as string | undefined;
      if (raw) return JSON.parse(raw) as string[];
    } catch {}
    return ["cod"];
  })();
  const paymentMethods = ALL_PAYMENT_METHODS.filter((m) => enabledMethods.includes(m.value));

  useEffect(() => {
    if (paymentMethods.length > 0 && !form.paymentMethod) {
      setForm((p) => ({ ...p, paymentMethod: paymentMethods[0].value }));
    }
  }, [enabledMethods.join(",")]);

  const update = (key: keyof CheckoutForm, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const applyCoupon = async () => {
    if (!form.couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const { data, error } = await supabase
        .from("coupons_public")
        .select("*")
        .eq("code", form.couponCode.trim().toUpperCase())
        .eq("is_valid", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        toast({ title: "Invalid coupon", description: "This coupon code is not valid or has expired.", variant: "destructive" });
        return;
      }
      if (unitPrice < Number(data.min_order_amount)) {
        toast({ title: "Minimum order not met", description: `Min order: ${sym}${Number(data.min_order_amount).toFixed(2)}`, variant: "destructive" });
        return;
      }
      const discountAmount = data.discount_type === "percentage"
        ? unitPrice * (Number(data.discount_value) / 100)
        : Number(data.discount_value);
      setDiscount(Math.min(discountAmount, unitPrice));
      setCouponApplied(data.code!);
      toast({ title: `Coupon applied: ${data.discount_type === "percentage" ? `${data.discount_value}% off` : `${sym}${Number(data.discount_value).toFixed(2)} off`}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setDiscount(0);
    setCouponApplied(null);
    setForm((p) => ({ ...p, couponCode: "" }));
  };

  const placeOrder = async () => {
    if (!form.name || !form.email || !form.phone) {
      toast({ title: "Please fill in your name, email, and phone", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data: customerId, error: custErr } = await supabase.rpc("upsert_checkout_customer", {
        _email: form.email.trim(),
        _name: form.name,
        _phone: form.phone,
        _address: form.address,
      });
      if (custErr) throw custErr;

      const finalTotal = Math.max(total, 0);

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          customer_id: customerId,
          customer_name: form.name,
          customer_email: form.email.trim(),
          customer_phone: form.phone,
          shipping_address: form.address,
          subtotal: unitPrice,
          discount,
          shipping_cost: 0,
          total: finalTotal,
          payment_method: form.paymentMethod,
          coupon_code: couponApplied,
          notes: form.notes,
          status: "pending",
          payment_status: "unpaid",
        })
        .select("id, order_number")
        .single();
      if (orderErr) throw orderErr;

      const { error: itemsErr } = await supabase.from("order_items").insert({
        order_id: order.id,
        product_id: linkedProductId,
        product_name: productName,
        tier_label: "Landing Page",
        quantity: 1,
        unit_price: unitPrice,
        total: unitPrice,
      });
      if (itemsErr) throw itemsErr;

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      fetch(`https://${projectId}.supabase.co/functions/v1/order-webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: order.id, event: "order.created" }),
      }).catch(() => {});
      fetch(`https://${projectId}.supabase.co/functions/v1/send-order-confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: order.id }),
      }).catch(() => {});

      if (form.paymentMethod === "bkash") {
        const callbackURL = `${window.location.origin}/bkash/callback`;
        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/bkash-payment?action=create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.id, callbackURL, payerReference: form.phone }),
        });
        const bkashData = await res.json();
        if (bkashData.bkashURL) {
          localStorage.setItem("bkash_order_id", order.id);
          localStorage.setItem("bkash_order_number", order.order_number);
          window.location.href = bkashData.bkashURL;
          return;
        } else {
          throw new Error(bkashData.error || "Failed to initiate bKash payment");
        }
      }

      setOrderPlaced(order.order_number);
    } catch (err: any) {
      toast({ title: "Failed to place order", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "h-10 w-full rounded-xl border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  if (orderPlaced) {
    return (
      <section id="checkout" className="py-20">
        <div className="container max-w-lg mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
            <h2 className="text-3xl font-display font-bold mb-3">Order Placed!</h2>
            <p className="text-muted-foreground mb-2">Thank you for your purchase.</p>
            <p className="text-sm font-mono bg-muted rounded-xl inline-block px-4 py-2 mb-4">{orderPlaced}</p>
            <p className="text-sm text-muted-foreground">We'll send a confirmation to your email shortly.</p>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="checkout" className="py-20 bg-muted/30">
      <div className="container max-w-5xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-3xl font-display font-bold text-center mb-2">
            {content.heading || "Complete Your Order"}
          </h2>
          {content.subheading && <p className="text-center text-muted-foreground mb-10">{content.subheading}</p>}

          <div className="grid gap-8 lg:grid-cols-5">
            {/* Form */}
            <div className="lg:col-span-3 space-y-6">
              <div className="rounded-xl border border-border bg-card">
                <div className="p-4 border-b border-border">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Contact Information</h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-medium mb-1 block">Full Name *</label>
                      <input value={form.name} onChange={(e) => update("name", e.target.value)} className={inputClass} placeholder="John Doe" />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Email *</label>
                      <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className={inputClass} placeholder="john@example.com" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Phone *</label>
                    <input value={form.phone} onChange={(e) => update("phone", e.target.value)} className={inputClass} placeholder="+880 1234 567890" />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card">
                <div className="p-4 border-b border-border">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Address</h3>
                </div>
                <div className="p-4">
                  <label className="text-xs font-medium mb-1 block">Full Address</label>
                  <textarea value={form.address} onChange={(e) => update("address", e.target.value)} className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]" placeholder="House/Apt, Street, Area, City, Country..." />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card">
                <div className="p-4 border-b border-border">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Payment Method</h3>
                </div>
                <div className="p-4 space-y-2">
                  {paymentMethods.length === 0 && <p className="text-sm text-muted-foreground">No payment methods available.</p>}
                  {paymentMethods.map((m) => (
                    <label key={m.value} className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${form.paymentMethod === m.value ? "border-primary bg-primary/5" : "border-border hover:border-foreground/20"}`}>
                      <input type="radio" name="lp-payment" value={m.value} checked={form.paymentMethod === m.value} onChange={(e) => update("paymentMethod", e.target.value)} className="h-4 w-4 accent-primary" />
                      <span className="text-sm font-medium">{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block">Order Notes (optional)</label>
                <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]" placeholder="Special instructions..." />
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-border bg-card sticky top-24">
                <div className="p-4 border-b border-border">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Order Summary</h3>
                </div>

                <div className="p-4 border-b border-border">
                  <div className="flex gap-4">
                    {productImage && (
                      <img src={productImage} alt="" className="w-16 h-16 rounded-lg object-cover border border-border" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{productName}</p>
                      <p className="text-lg font-bold text-primary mt-1">{sym}{unitPrice.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-b border-border space-y-2">
                  {couponApplied ? (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-500">Coupon: {couponApplied}</span>
                      <button onClick={removeCoupon} className="text-xs text-destructive underline">Remove</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input value={form.couponCode} onChange={(e) => update("couponCode", e.target.value)} placeholder="Coupon code" className="h-9 flex-1 rounded-xl border border-border bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary" />
                      <Button variant="outline" size="sm" onClick={applyCoupon} disabled={couponLoading}>{couponLoading ? "..." : "Apply"}</Button>
                    </div>
                  )}
                </div>

                <div className="p-4 border-b border-border space-y-1.5">
                  <div className="flex justify-between text-sm"><span>Subtotal</span><span>{sym}{unitPrice.toFixed(2)}</span></div>
                  {discount > 0 && <div className="flex justify-between text-sm text-green-500"><span>Discount</span><span>-{sym}{discount.toFixed(2)}</span></div>}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                    <span>Total</span>
                    <span>{sym}{Math.max(total, 0).toFixed(2)}</span>
                  </div>
                </div>

                <div className="p-4">
                  <Button variant="gradient" size="lg" className="w-full" onClick={placeOrder} disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {content.buttonText || "Place Order"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Renderers map ───────────────────────────────────────────────────

const renderers: Record<string, React.FC<{ content: SectionContent }>> = {
  hero: HeroSection,
  features: FeaturesSection,
  cta: CTASection,
  testimonial: TestimonialSection,
  stats: StatsSection,
  faq: FAQSection,
  "text-image": TextImageSection,
  pricing: PricingSection,
  "how-it-works": HowItWorksSection,
  guarantee: GuaranteeSection,
  "product-showcase": ProductShowcaseSection,
  bonus: BonusSection,
  countdown: CountdownSection,
};

export default function LandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [lang, setLang] = useState<Lang | null>(null);

  const { data: page, isLoading } = useQuery({
    queryKey: ["landing-page", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landing_pages")
        .select("*")
        .eq("slug", slug!)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!slug,
  });

  // Fetch linked product data if product_id exists
  const productId = page?.product_id as string | null;
  const { data: linkedProduct } = useQuery({
    queryKey: ["landing-product", productId],
    queryFn: async () => {
      const { data: prod } = await supabase
        .from("products")
        .select("id, name, price, image_url, slug")
        .eq("id", productId!)
        .maybeSingle();
      if (!prod) return null;
      const { data: tiers } = await supabase
        .from("product_tiers")
        .select("*")
        .eq("product_id", productId!)
        .order("sort_order");
      const { data: images } = await supabase
        .from("product_images")
        .select("image_url")
        .eq("product_id", productId!)
        .order("sort_order")
        .limit(1);
      const defaultTier = tiers?.find((t) => t.is_default) || tiers?.[0];
      return {
        id: prod.id,
        name: prod.name,
        price: defaultTier?.price ?? prod.price,
        image: images?.[0]?.image_url || prod.image_url || "",
        slug: prod.slug,
      };
    },
    enabled: !!productId,
  });

  const languageMode = (page?.language_mode as string) || "both";

  useEffect(() => {
    if (!page) return;
    if (languageMode === "en") { setLang("en"); return; }
    if (languageMode === "bn") { setLang("bn"); return; }
    const saved = sessionStorage.getItem(`lp-lang-${slug}`);
    if (saved === "en" || saved === "bn") setLang(saved);
  }, [slug, page, languageMode]);

  const handleLangSelect = (l: Lang) => {
    setLang(l);
    sessionStorage.setItem(`lp-lang-${slug}`, l);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!page) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
            <p className="text-muted-foreground">This landing page doesn't exist or isn't published.</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!lang && languageMode === "both") {
    return <LanguagePopup onSelect={handleLangSelect} />;
  }

  if (!lang) return null;

  const tmpl = landingTemplates.find((t) => t.id === page.template);
  const sections: SectionsData = lang === "bn" ? page.sections_bn : page.sections_en;

  return (
    <Layout>
      <SEOHead title={page.title} description={sections?.hero?.subheading || ""} />

      {languageMode === "both" && (
        <button
          onClick={() => setLang(lang === "en" ? "bn" : "en")}
          className="fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:bg-muted transition-colors"
          title="Switch language"
        >
          <span className="text-lg">{lang === "en" ? "🇧🇩" : "🇺🇸"}</span>
        </button>
      )}

      {tmpl?.sections.map((sec) => {
        if (sec.type === "checkout") {
          const checkoutContent = sections?.[sec.id] || {};
          return (
            <LandingCheckoutSection
              key={sec.id}
              content={checkoutContent}
              allSections={sections}
              pageTitle={page.title}
              linkedProduct={linkedProduct}
            />
          );
        }
        const Renderer = renderers[sec.type];
        const content = sections?.[sec.id];
        if (!Renderer || !content) return null;
        return <Renderer key={sec.id} content={content} />;
      })}
    </Layout>
  );
}
