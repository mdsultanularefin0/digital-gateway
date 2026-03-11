import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

export function Testimonials() {
  const { data: reviews = [] } = useQuery({
    queryKey: ["featured-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews_public")
        .select("*")
        .eq("featured", true)
        .eq("approved", true)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (reviews.length === 0) return null;

  return (
    <section className="py-20 md:py-32">
      <div className="container px-5 md:px-8">
        <div className="mb-12 md:mb-16">
          <p className="text-[11px] font-semibold tracking-wide-custom uppercase text-muted-foreground mb-3">
            What People Say
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Trusted by Professionals
          </h2>
        </div>
        <div className="grid gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="rounded-lg border border-border bg-card p-6"
            >
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: r.rating || 5 }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>
              {r.title && <h4 className="font-semibold text-foreground mb-1">{r.title}</h4>}
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">"{r.content}"</p>
              <p className="text-xs font-medium text-foreground">{r.customer_name}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
