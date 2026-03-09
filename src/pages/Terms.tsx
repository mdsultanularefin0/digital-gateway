import { Layout } from "@/components/Layout";

export default function TermsPage() {
  return (
    <Layout>
      <section className="py-16 md:py-24">
        <div className="container max-w-3xl">
          <h1 className="text-3xl font-display font-bold md:text-4xl mb-8">Terms of Service</h1>
          <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
            <p>Last updated: March 8, 2026</p>
            <h2 className="text-lg font-display font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>By accessing and using DigiStack services, you agree to be bound by these Terms of Service and all applicable laws and regulations.</p>
            <h2 className="text-lg font-display font-semibold text-foreground">2. Use of Services</h2>
            <p>Our services are provided for your personal and commercial use. You agree not to misuse our services or help anyone else do so.</p>
            <h2 className="text-lg font-display font-semibold text-foreground">3. Subscriptions & Payments</h2>
            <p>All payments and subscriptions are processed through third-party payment providers. We do not store your payment information directly.</p>
            <h2 className="text-lg font-display font-semibold text-foreground">4. Intellectual Property</h2>
            <p>All content and materials available through our services are protected by intellectual property rights and remain the property of DigiStack.</p>
            <h2 className="text-lg font-display font-semibold text-foreground">5. Limitation of Liability</h2>
            <p>DigiStack shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of our services.</p>
            <h2 className="text-lg font-display font-semibold text-foreground">6. Contact</h2>
            <p>For questions about these Terms, contact us at legal@digistack.com.</p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
