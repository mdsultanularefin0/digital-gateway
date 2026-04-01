import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Mail, MapPin, Phone, MessageCircle } from "lucide-react";
import { useSiteSettings } from "@/hooks/use-site-settings";

export default function ContactPage() {
  const { data: settings } = useSiteSettings();

  const contactEmail = settings?.contact_email || settings?.support_email || "hello@example.com";
  const contactPhone = settings?.contact_phone || "";
  const whatsapp = settings?.whatsapp_number || "";
  const address = [settings?.contact_address, settings?.city, settings?.state, settings?.country]
    .filter(Boolean)
    .join(", ") || "Not specified";

  return (
    <Layout>
      <section className="py-16 md:py-24">
        <div className="container px-5 md:px-8 max-w-4xl">
          <div className="text-center mb-16">
            <h1 className="text-3xl font-display font-bold md:text-5xl">Get in Touch</h1>
            <p className="mt-4 text-muted-foreground">Have questions? We'd love to hear from you.</p>
          </div>

          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
                <div>
                  <label className="text-sm font-medium mb-1 block">Name</label>
                  <input className="h-10 w-full rounded-xl border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Your name" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Email</label>
                  <input type="email" className="h-10 w-full rounded-xl border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="you@example.com" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Message</label>
                  <textarea className="w-full rounded-xl border border-border bg-background p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[120px]" placeholder="Your message..." />
                </div>
                <Button variant="gradient" size="lg">Send Message</Button>
              </form>
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">Email</h3>
                  <a href={`mailto:${contactEmail}`} className="text-sm text-muted-foreground hover:text-primary">{contactEmail}</a>
                </div>
              </div>
              {contactPhone && (
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">Phone</h3>
                    <a href={`tel:${contactPhone}`} className="text-sm text-muted-foreground hover:text-primary">{contactPhone}</a>
                  </div>
                </div>
              )}
              {whatsapp && (
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                    <MessageCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">WhatsApp</h3>
                    <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary">{whatsapp}</a>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">Location</h3>
                  <p className="text-sm text-muted-foreground">{address}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
