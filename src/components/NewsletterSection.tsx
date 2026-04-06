import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import { Mail } from "lucide-react";

const emailSchema = z.string().trim().email("Please enter a valid email").max(255);

export function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast({ title: "Invalid email", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("newsletter_subscribers")
      .upsert({ email: parsed.data, active: true }, { onConflict: "email" });
    setLoading(false);

    if (error) {
      console.error("Newsletter error:", error);
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
      return;
    }
    toast({ title: "Subscribed! ✉️", description: "You'll receive updates on new products and offers." });
    setEmail("");
  };

  return (
    <section className="py-16 md:py-32">
      <div className="container px-5 md:px-8">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <p className="text-[11px] font-semibold tracking-wide-custom uppercase text-muted-foreground mb-3">
            Newsletter
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight text-foreground">
            Stay informed
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground">
            Get updates on new products, features, and exclusive offers.
          </p>
          <form onSubmit={handleSubscribe} className="mt-6 md:mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="h-12 rounded-xl border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 w-full sm:w-72"
            />
            <Button type="submit" variant="default" size="lg" className="w-full sm:w-auto" disabled={loading}>
              {loading ? "Subscribing..." : "Subscribe"}
            </Button>
          </form>
          <p className="mt-4 text-xs text-muted-foreground">No spam. Unsubscribe anytime.</p>
        </div>
      </div>
    </section>
  );
}
