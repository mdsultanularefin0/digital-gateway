import { Layout } from "@/components/Layout";

export default function PrivacyPage() {
  return (
    <Layout>
      <section className="py-16 md:py-24">
        <div className="container max-w-3xl">
          <h1 className="text-3xl font-display font-bold md:text-4xl mb-8">Privacy Policy</h1>
          <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
            <p>Last updated: March 8, 2026</p>
            <h2 className="text-lg font-display font-semibold text-foreground">1. Information We Collect</h2>
            <p>We collect information you provide directly, such as your name, email address, and any other information you choose to provide when using our services or contacting us.</p>
            <h2 className="text-lg font-display font-semibold text-foreground">2. How We Use Your Information</h2>
            <p>We use the information we collect to provide, maintain, and improve our services, communicate with you, and protect our users.</p>
            <h2 className="text-lg font-display font-semibold text-foreground">3. Information Sharing</h2>
            <p>We do not sell your personal information. We may share information with third-party service providers who assist in operating our services.</p>
            <h2 className="text-lg font-display font-semibold text-foreground">4. Data Security</h2>
            <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>
            <h2 className="text-lg font-display font-semibold text-foreground">5. Contact Us</h2>
            <p>If you have questions about this Privacy Policy, please contact us at privacy@digistack.com.</p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
