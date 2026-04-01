import { Layout } from "@/components/Layout";
import { Users, Target, Heart } from "lucide-react";
import { useSiteSettings } from "@/hooks/use-site-settings";

const values = [
  { icon: Target, title: "Mission-Driven", desc: "We build tools that genuinely help teams work better." },
  { icon: Users, title: "Customer First", desc: "Every decision starts with understanding our users' needs." },
  { icon: Heart, title: "Quality Obsessed", desc: "We sweat the details so you don't have to." },
];

export default function AboutPage() {
  const { data: settings } = useSiteSettings();
  const siteName = settings?.site_name || "GiftCardVibe";

  return (
    <Layout>
      <section className="py-16 md:py-24">
        <div className="container px-5 md:px-8 max-w-4xl">
          <div className="text-center mb-16">
            <h1 className="text-3xl font-display font-bold md:text-5xl">About {siteName}</h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              We're a team of builders, designers, and data enthusiasts on a mission to create the best digital tools for modern teams.
            </p>
          </div>

          <div className="prose prose-lg mx-auto text-muted-foreground mb-16 text-center">
            <p>
              Founded in 2024, {siteName} started with a simple idea: digital tools should be beautiful, powerful, and accessible. 
              Today, we serve over 50,000 users across 120+ countries with our growing suite of premium products.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {values.map((v) => (
              <div key={v.title} className="rounded-xl border border-border bg-card p-6 text-center shadow-card">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                  <v.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold">{v.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
