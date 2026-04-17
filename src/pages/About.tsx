import { Layout } from "@/components/Layout";
import { Users, Target, Heart } from "lucide-react";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { usePageContents } from "@/hooks/use-page-contents";
import { usePageMeta } from "@/hooks/use-page-meta";
import { SEOHead } from "@/components/SEOHead";
import DOMPurify from "dompurify";

const iconMap: Record<string, React.ElementType> = { Target, Users, Heart };

const defaultValues = [
  { icon: "Target", title: "Mission-Driven", desc: "We build tools that genuinely help teams work better." },
  { icon: "Users", title: "Customer First", desc: "Every decision starts with understanding our users' needs." },
  { icon: "Heart", title: "Quality Obsessed", desc: "We sweat the details so you don't have to." },
];

const defaultBody = `<p>Founded in 2024, we started with a simple idea: digital tools should be beautiful, powerful, and accessible. Today, we serve over 50,000 users across 120+ countries with our growing suite of premium products.</p>`;

export default function AboutPage() {
  const { data: settings } = useSiteSettings();
  const { data: pageContent } = usePageContents("about");
  const { data: pageMeta } = usePageMeta("about");
  const siteName = settings?.site_name || "GiftCardVibe";
  const heading = pageContent?.heading || `About ${siteName}`;
  const subheading = pageContent?.subheading || "We're a team of builders, designers, and data enthusiasts on a mission to create the best digital tools for modern teams.";
  const body = pageContent?.body || defaultBody;

  let values = defaultValues;
  if (pageContent?.values) {
    try {
      const parsed = JSON.parse(pageContent.values);
      if (Array.isArray(parsed) && parsed.length > 0) values = parsed;
    } catch {}
  }

  return (
    <Layout>
      <SEOHead
        title={pageMeta?.meta_title?.trim() || heading}
        description={pageMeta?.meta_description?.trim() || subheading}
        keywords={pageMeta?.meta_keywords?.trim() || undefined}
        ogImage={pageMeta?.og_image_url?.trim() || undefined}
      />
      <section className="py-16 md:py-24">
        <div className="container px-5 md:px-8 max-w-4xl">
          <div className="text-center mb-16">
            <h1 className="text-3xl font-display font-bold md:text-5xl">{heading}</h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">{subheading}</p>
          </div>

          <div
            className="prose prose-lg mx-auto text-muted-foreground mb-16 text-center dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body) }}
          />

          <div className="grid gap-6 md:grid-cols-3">
            {values.map((v) => {
              const Icon = iconMap[v.icon] || Target;
              return (
                <div key={v.title} className="rounded-xl border border-border bg-card p-6 text-center shadow-card">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold">{v.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </Layout>
  );
}
