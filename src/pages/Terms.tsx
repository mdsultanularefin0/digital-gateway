import { Layout } from "@/components/Layout";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { usePageContents } from "@/hooks/use-page-contents";
import DOMPurify from "dompurify";

const defaultBody = `<p>Last updated: March 8, 2026</p>
<h2>1. Acceptance of Terms</h2>
<p>By accessing and using our services, you agree to be bound by these Terms of Service and all applicable laws and regulations.</p>
<h2>2. Use of Services</h2>
<p>Our services are provided for your personal and commercial use. You agree not to misuse our services or help anyone else do so.</p>
<h2>3. Subscriptions &amp; Payments</h2>
<p>All payments and subscriptions are processed through third-party payment providers. We do not store your payment information directly.</p>
<h2>4. Intellectual Property</h2>
<p>All content and materials available through our services are protected by intellectual property rights.</p>
<h2>5. Limitation of Liability</h2>
<p>We shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of our services.</p>
<h2>6. Contact</h2>
<p>For questions about these Terms, please contact us.</p>`;

export default function TermsPage() {
  const { data: settings } = useSiteSettings();
  const { data: pageContent } = usePageContents("terms");
  const heading = pageContent?.heading || "Terms of Service";
  const body = pageContent?.body || defaultBody;

  return (
    <Layout>
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
