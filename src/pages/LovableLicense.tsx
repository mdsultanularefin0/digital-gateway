import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, Shield, Zap, Crown, ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEOHead } from "@/components/SEOHead";

type PlanId = "1d" | "7d" | "30d" | "1y" | "reseller";

const plans: {
  id: PlanId;
  name: string;
  price: number;
  period: string;
  tagline: string;
  features: string[];
  highlight?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "1d",
    name: "1 Day Pass",
    price: 99,
    period: "24 hours",
    tagline: "Try it out",
    icon: Zap,
    features: [
      "Full Lovable access for 24h",
      "Unlimited AI prompts",
      "1 active project",
      "Community support",
    ],
  },
  {
    id: "7d",
    name: "7 Day License",
    price: 299,
    period: "1 week",
    tagline: "Weekend builder",
    icon: Sparkles,
    features: [
      "Everything in 1 Day",
      "3 active projects",
      "Priority AI queue",
      "Email support",
    ],
  },
  {
    id: "30d",
    name: "30 Day License",
    price: 499,
    period: "1 month",
    tagline: "Most popular",
    highlight: true,
    icon: Star,
    features: [
      "Everything in 7 Day",
      "10 active projects",
      "Custom domains",
      "Priority support",
    ],
  },
  {
    id: "1y",
    name: "1 Year License",
    price: 1999,
    period: "12 months",
    tagline: "Best value",
    icon: Crown,
    features: [
      "Everything in 30 Day",
      "Unlimited projects",
      "Team collaboration",
      "24/7 dedicated support",
    ],
  },
];

export default function LovableLicense() {
  const [selected, setSelected] = useState<PlanId>("30d");

  const scrollToPlans = () => {
    document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleBuy = (id: PlanId) => {
    setSelected(id);
    document.getElementById("checkout")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <SEOHead
        title="Lovable License — 1 Day, 7 Day, 30 Day & Yearly Plans"
        description="Get official Lovable licenses starting at ৳99. Weekly, monthly, yearly plans plus reseller admin panel."
        canonical="https://secure-link-shop.lovable.app/lovable-license"
      />
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
        {/* Nav */}
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/40">
          <div className="container flex h-16 items-center justify-between px-5 md:px-8">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">Lovable License</span>
            </div>
            <Button size="sm" variant="gradient" onClick={scrollToPlans}>
              Get License
            </Button>
          </div>
        </header>

        {/* Hero */}
        <section className="pt-16 pb-20 md:pt-24 md:pb-32">
          <div className="container px-5 md:px-8 text-center max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge className="mb-6 px-4 py-1.5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
                <Sparkles className="h-3 w-3 mr-1.5" />
                Official Lovable Licenses
              </Badge>
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
                Build faster with
                <br />
                <span className="bg-gradient-to-r from-primary via-primary to-primary/60 bg-clip-text text-transparent">
                  Lovable licenses
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                Instant activation. No monthly commitment. Pick a pass that fits your build sprint — from a 24-hour try to a full year.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="gradient" size="lg" onClick={scrollToPlans}>
                  View Plans <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline-primary" size="lg" onClick={() => document.getElementById("reseller")?.scrollIntoView({ behavior: "smooth" })}>
                  Become a Reseller
                </Button>
              </div>
              <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Instant delivery</div>
                <div className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Genuine keys</div>
                <div className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> bKash / Nagad</div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Plans */}
        <section id="plans" className="py-20 md:py-24">
          <div className="container px-5 md:px-8">
            <div className="text-center mb-14">
              <p className="text-[11px] font-semibold tracking-widest uppercase text-primary mb-3">Pricing</p>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Pick your license</h2>
              <p className="text-muted-foreground mt-4 max-w-xl mx-auto">All prices in BDT. One-time payment, no auto-renew.</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
              {plans.map((plan, i) => {
                const Icon = plan.icon;
                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.08 }}
                  >
                    <Card
                      className={`relative p-6 h-full flex flex-col transition-all hover:-translate-y-1 hover:shadow-xl ${
                        plan.highlight
                          ? "border-primary shadow-lg ring-2 ring-primary/20 bg-gradient-to-b from-primary/5 to-transparent"
                          : "border-border/60"
                      }`}
                    >
                      {plan.highlight && (
                        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                          Most Popular
                        </Badge>
                      )}
                      <div className="mb-4">
                        <div className={`h-11 w-11 rounded-xl flex items-center justify-center mb-4 ${
                          plan.highlight ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                        }`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="text-lg font-bold">{plan.name}</h3>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">{plan.tagline}</p>
                      </div>
                      <div className="mb-5">
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold">৳{plan.price}</span>
                          <span className="text-muted-foreground text-sm">/{plan.period}</span>
                        </div>
                      </div>
                      <ul className="space-y-2.5 mb-6 flex-1">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">{f}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        variant={plan.highlight ? "gradient" : "outline-primary"}
                        className="w-full"
                        onClick={() => handleBuy(plan.id)}
                      >
                        Buy Now
                      </Button>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Reseller */}
        <section id="reseller" className="py-20 md:py-28">
          <div className="container px-5 md:px-8 max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="relative overflow-hidden p-8 md:p-14 border-primary/30 bg-gradient-to-br from-primary/10 via-background to-primary/5">
                <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-primary/20 blur-3xl -z-0" />
                <div className="relative z-10 grid md:grid-cols-2 gap-10 items-center">
                  <div>
                    <Badge className="mb-4 bg-primary text-primary-foreground">
                      <Crown className="h-3 w-3 mr-1.5" /> Reseller Program
                    </Badge>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                      Sell Lovable licenses under your own brand
                    </h2>
                    <p className="text-muted-foreground text-base md:text-lg mb-6">
                      Get your own admin panel to generate, manage, and sell licenses to your customers. Set your own prices, track sales, and keep 100% of the margin.
                    </p>
                    <ul className="space-y-2.5 mb-8">
                      {[
                        "Full admin panel with license generator",
                        "Bulk license key creation",
                        "Customer & order management",
                        "Sales dashboard & analytics",
                        "White-label ready",
                        "Priority reseller support",
                      ].map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="text-center md:text-left">
                    <Card className="p-8 bg-background/80 backdrop-blur border-primary/30">
                      <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">One-time Payment</p>
                      <div className="flex items-baseline gap-2 mb-1 justify-center md:justify-start">
                        <span className="text-5xl font-bold">৳3,999</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-6">Lifetime admin panel access</p>
                      <Button variant="gradient" size="lg" className="w-full" onClick={() => handleBuy("reseller")}>
                        Get Reseller Panel <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                      <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5 justify-center">
                        <Shield className="h-3 w-3" /> 7-day money-back guarantee
                      </p>
                    </Card>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Checkout anchor */}
        <section id="checkout" className="py-20">
          <div className="container px-5 md:px-8 max-w-2xl">
            <Card className="p-8 md:p-10">
              <h3 className="text-2xl font-bold mb-2">Complete your order</h3>
              <p className="text-muted-foreground mb-6">
                Selected: <span className="font-semibold text-foreground">
                  {selected === "reseller"
                    ? "Reseller Admin Panel — ৳3,999"
                    : `${plans.find((p) => p.id === selected)?.name} — ৳${plans.find((p) => p.id === selected)?.price}`}
                </span>
              </p>
              <div className="space-y-4">
                <div className="rounded-lg border border-border p-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    Payment methods: <span className="font-semibold text-foreground">bKash · Nagad · Card</span>
                  </p>
                </div>
                <Button variant="gradient" size="lg" className="w-full" asChild>
                  <a href={`mailto:support@giftcardvibe.xyz?subject=Lovable License Order — ${selected}`}>
                    Contact to Order <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Your license key is delivered within 5 minutes of payment confirmation.
                </p>
              </div>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/40 py-10">
          <div className="container px-5 md:px-8 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Lovable License Reseller · support@giftcardvibe.xyz
          </div>
        </footer>
      </div>
    </>
  );
}
