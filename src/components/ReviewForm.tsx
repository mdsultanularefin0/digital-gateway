import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Star, Loader2 } from "lucide-react";

interface ReviewFormProps {
  productId: string;
  onSubmitted: () => void;
}

export function ReviewForm({ productId, onSubmitted }: ReviewFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !content.trim()) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("reviews").insert({
        product_id: productId,
        customer_name: name.trim(),
        customer_email: email.trim(),
        title: title.trim(),
        content: content.trim(),
        rating,
        approved: false,
      });
      if (error) throw error;
      toast({ title: "Review submitted!", description: "Your review will appear once approved." });
      setName(""); setEmail(""); setTitle(""); setContent(""); setRating(5);
      onSubmitted();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "h-10 w-full rounded-[4px] border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <form onSubmit={handleSubmit} className="rounded-[4px] border border-border p-6 space-y-4">
      <h3 className="text-lg font-display font-semibold">Write a Review</h3>

      {/* Star Rating */}
      <div>
        <label className="text-sm font-medium mb-2 block">Rating</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setRating(i)}
              onMouseEnter={() => setHoveredRating(i)}
              onMouseLeave={() => setHoveredRating(0)}
              className="p-0.5"
            >
              <Star
                className={`h-6 w-6 transition-colors ${
                  i <= (hoveredRating || rating)
                    ? "fill-primary text-primary"
                    : "text-border"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium mb-1 block">Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Your name" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Email *</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="your@email.com" />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="Summary of your review" />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Review *</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full rounded-[4px] border border-border bg-background p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
          placeholder="Share your experience..."
        />
      </div>
      <Button variant="gradient" type="submit" disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Submit Review
      </Button>
    </form>
  );
}
