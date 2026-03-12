import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { SEOHead } from "@/components/SEOHead";
import { Testimonials } from "@/components/Testimonials";
import { NewsletterSection } from "@/components/NewsletterSection";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { WelcomePopup } from "@/components/WelcomePopup";
import { useProducts } from "@/data/products";
import { useSiteSettings } from "@/hooks/use-site-settings";
import defaultHeroImage from "@/assets/hero-glass-render.png";

const stats = [
  { value: "50K+", label: "Active Users" },
  { value: "99.9%", label: "Uptime" },
  { value: "120+", label: "Countries" },
  { value: "3.2x", label: "Avg Growth" },
];

export default function HomePage() {
  const { data: allProducts = [] } = useProducts();
  const { data: settings } = useSiteSettings();
  const featured = allProducts.filter((p) => p.featured).slice(0, 3);
  const siteName = settings?.site_name || "GiftCardVibe";
  const tagline = settings?.site_tagline || "Premium digital products designed for teams who demand precision, speed, and simplicity.";
  const heroImage = settings?.hero_image_url || defaultHeroImage;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    description: tagline,
    url: "https://secure-link-shop.lovable.app",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://secure-link-shop.lovable.app/products?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <SEOHead
        title={`${siteName} — Premium Digital Products`}
        description={tagline}
        canonical="https://secure-link-shop.lovable.app/"
        type="website"
        jsonLd={jsonLd}
      />
      <AnnouncementBanner />
      <WelcomePopup />
      <Layout>
        {/* Hero */}
        <section className="flex items-center pt-24 pb-12 lg:min-h-[100dvh] lg:pt-16 lg:pb-0">
          <div className="container px-5 md:px-8 w-full">
            <div className="flex flex-col items-center text-center lg:grid lg:grid-cols-2 lg:gap-8 lg:text-left lg:items-center">
              <div className="max-w-xl mx-auto lg:mx-0">
                <motion.p
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="text-[11px] font-semibold tracking-wide-custom uppercase text-muted-foreground mb-5"
                >
                  Digital Subscription Boutique
                </motion.p>
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.1 }}
                  className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.08] text-foreground"
                >
                  Tools that<br />elevate your<br /><span className="text-primary">workflow</span>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                  className="mt-4 md:mt-7 text-sm md:text-lg text-muted-foreground leading-relaxed max-w-md mx-auto lg:mx-0"
                >
                  {tagline}
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.3 }}
                  className="mt-6 md:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3"
                >
                  <Button variant="gradient" size="default" asChild>
                    <Link to="/products">Browse Products <ArrowRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
                  <Button variant="outline-primary" size="default" asChild>
                    <Link to="/about">Learn More</Link>
                  </Button>
                </motion.div>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="hidden lg:flex justify-end"
              >
                <img
                  src={heroImage}
                  alt="Abstract 3D glass sculpture"
                  className="w-[320px] lg:w-[460px] xl:w-[540px] animate-float select-none"
                  draggable={false}
                  loading="eager"
                  width={540}
                  height={540}
                />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-20 md:py-32">
          <div className="container px-5 md:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  className="text-center md:text-left"
                >
                  <div className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-none">
                    {stat.value}
                  </div>
                  <div className="mt-2 text-[11px] font-medium tracking-wide-custom uppercase text-muted-foreground">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <div className="container px-5 md:px-8"><div className="h-px bg-border" /></div>

        {/* Featured Products */}
        {featured.length > 0 && (
          <section className="py-20 md:py-32">
            <div className="container px-5 md:px-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 md:mb-16 gap-4">
                <div>
                  <p className="text-[11px] font-semibold tracking-wide-custom uppercase text-muted-foreground mb-3">Curated Selection</p>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">Featured Products</h2>
                </div>
                <Button variant="outline-primary" size="sm" asChild className="hidden md:flex">
                  <Link to="/products">View All <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </div>
              <div className="grid gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              <div className="mt-10 text-center md:hidden">
                <Button variant="outline-primary" asChild className="w-full sm:w-auto">
                  <Link to="/products">View All Products</Link>
                </Button>
              </div>
            </div>
          </section>
        )}

        <div className="container px-5 md:px-8"><div className="h-px bg-border" /></div>

        {/* Testimonials */}
        <Testimonials />

        <div className="container px-5 md:px-8"><div className="h-px bg-border" /></div>

        {/* Newsletter */}
        <NewsletterSection />
      </Layout>
    </>
  );
}
