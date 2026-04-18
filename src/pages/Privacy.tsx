import { Layout } from "@/components/Layout";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { usePageContents } from "@/hooks/use-page-contents";
import { usePageMeta } from "@/hooks/use-page-meta";
import { SEOHead } from "@/components/SEOHead";
import DOMPurify from "dompurify";

const defaultBody = `<p>Last updated: March 8, 2026</p>
<h2>1. Information We Collect</h2>
<p>We collect information you provide directly, such as your name, email address, and any other information you choose to provide when using our services or contacting us.</p>
<h2>2. How We Use Your Information</h2>
<p>We use the information we collect to provide, maintain, and improve our services, communicate with you, and protect our users.</p>
<h2>3. Information Sharing</h2>
<p>We do not sell your personal information. We may share information with third-party service providers who assist in operating our services.</p>
<h2>4. Data Security</h2>
<p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>
<h2>5. Contact Us</h2>
<p>If you have questions about this Privacy Policy, please contact us.</p>`;

export default function PrivacyPage() {
  const { data: pageContent } = usePageContents("privacy");
  const { data: pageMeta } = usePageMeta("privacy");
  const { data: settings } = useSiteSettings();
  const heading = pageContent?.heading || "Privacy Policy";
  const body = pageContent?.body || defaultBody;

  return (
    <Layout>
      <SEOHead
        title={pageMeta?.meta_title?.trim() || heading}
        description={pageMeta?.meta_description?.trim() || "How we collect, use, and protect your personal information."}
        keywords={pageMeta?.meta_keywords?.trim() || undefined}
        ogImage={pageMeta?.og_image_url?.trim() || (settings as any)?.default_og_image_url || undefined}
        canonical={pageMeta?.canonical_url?.trim() || undefined}
        twitterCard={(pageMeta?.twitter_card?.trim() || (settings as any)?.default_twitter_card || undefined) as any}
        siteName={(settings as any)?.site_name}
      />
      <section className="py-16 md:py-24">
        <div className="container max-w-3xl">
          <h1 className="text-3xl font-display font-bold md:text-4xl mb-8">{heading}</h1>
          <div
            className="prose prose-sm max-w-none text-muted-foreground leading-relaxed dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body) }}
          />
        </div>
      </section>
    </Layout>
  );
}
