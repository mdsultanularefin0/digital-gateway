import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, ArrowRight, CheckCircle, Star, HelpCircle, BarChart3 } from "lucide-react";
import { Layout } from "@/components/Layout";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { landingTemplates, type SectionsData, type SectionContent } from "@/data/landing-templates";

type Lang = "en" | "bn";

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
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-display font-bold leading-tight"
            >
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
            {content.buttonText && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Button size="xl" variant="gradient" asChild>
                  <a href={content.buttonUrl || "#"}>{content.buttonText} <ArrowRight className="ml-2 h-5 w-5" /></a>
                </Button>
              </motion.div>
            )}
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

function FeaturesSection({ content }: { content: SectionContent }) {
  if (!content.items?.length) return null;
  return (
    <section className="py-16 bg-muted/30">
      <div className="container max-w-6xl mx-auto px-4">
        {content.heading && <h2 className="text-3xl font-display font-bold text-center mb-3">{content.heading}</h2>}
        {content.subheading && <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">{content.subheading}</p>}
        <div className="grid gap-6 md:grid-cols-3">
          {content.items.filter(i => i.title).map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-border bg-card p-6"
            >
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

function CTASection({ content }: { content: SectionContent }) {
  if (!content.heading) return null;
  return (
    <section className="py-20">
      <div className="container max-w-3xl mx-auto px-4 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-12">
          <h2 className="text-3xl font-display font-bold mb-3">{content.heading}</h2>
          {content.subheading && <p className="text-muted-foreground mb-6">{content.subheading}</p>}
          {content.buttonText && (
            <Button size="xl" variant="gradient" asChild>
              <a href={content.buttonUrl || "#"}>{content.buttonText} <ArrowRight className="ml-2 h-5 w-5" /></a>
            </Button>
          )}
        </motion.div>
      </div>
    </section>
  );
}

function TestimonialSection({ content }: { content: SectionContent }) {
  if (!content.heading && !content.body) return null;
  return (
    <section className="py-16">
      <div className="container max-w-4xl mx-auto px-4 text-center">
        {content.heading && <h2 className="text-3xl font-display font-bold mb-8">{content.heading}</h2>}
        {content.body && (
          <blockquote className="text-xl italic text-muted-foreground max-w-2xl mx-auto relative">
            <Star className="h-6 w-6 text-primary mx-auto mb-4" />
            "{content.body}"
            {content.subheading && <cite className="block text-sm mt-4 not-italic font-medium text-foreground">— {content.subheading}</cite>}
          </blockquote>
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
              <Button variant="outline" asChild>
                <a href={content.buttonUrl || "#"}>{content.buttonText}</a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

const renderers: Record<string, React.FC<{ content: SectionContent }>> = {
  hero: HeroSection,
  features: FeaturesSection,
  cta: CTASection,
  testimonial: TestimonialSection,
  stats: StatsSection,
  faq: FAQSection,
  "text-image": TextImageSection,
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

  // Check saved preference
  useEffect(() => {
    const saved = sessionStorage.getItem(`lp-lang-${slug}`);
    if (saved === "en" || saved === "bn") setLang(saved);
  }, [slug]);

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

  if (!lang) {
    return <LanguagePopup onSelect={handleLangSelect} />;
  }

  const tmpl = landingTemplates.find((t) => t.id === page.template);
  const sections: SectionsData = lang === "bn" ? page.sections_bn : page.sections_en;

  return (
    <Layout>
      <SEOHead title={page.title} description={sections?.hero?.subheading || ""} />

      {/* Floating language switcher */}
      <button
        onClick={() => setLang(lang === "en" ? "bn" : "en")}
        className="fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:bg-muted transition-colors"
        title="Switch language"
      >
        <span className="text-lg">{lang === "en" ? "🇧🇩" : "🇺🇸"}</span>
      </button>

      {tmpl?.sections.map((sec) => {
        const Renderer = renderers[sec.type];
        const content = sections?.[sec.id];
        if (!Renderer || !content) return null;
        return <Renderer key={sec.id} content={content} />;
      })}
    </Layout>
  );
}
