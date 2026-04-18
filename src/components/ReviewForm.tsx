import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Star, Loader2, ImagePlus, X } from "lucide-react";
import { uploadToStorage } from "@/lib/storage";

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
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
        photo_urls: photos,
      });
      if (error) throw error;
      toast({ title: "Review submitted!", description: "Your review will appear once approved." });
      setName(""); setEmail(""); setTitle(""); setContent(""); setRating(5); setPhotos([]);
      onSubmitted();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFiles = async (files: FileList) => {
    if (photos.length >= 4) {
      toast({ title: "Max 4 photos", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const remaining = 4 - photos.length;
      const toUpload = Array.from(files).slice(0, remaining);
      const uploaded: string[] = [];
      for (const f of toUpload) {
        const { url } = await uploadToStorage(f, "reviews");
        uploaded.push(url);
      }
      setPhotos((p) => [...p, ...uploaded]);
    } catch (e: any) {
      toast({ title: "Upload failed", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const inputClass = "h-10 w-full rounded-xl border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border p-6 space-y-4">
      <h3 className="text-lg font-display font-semibold">Write a Review</h3>

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
                  i <= (hoveredRating || rating) ? "fill-primary text-primary" : "text-border"
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
          className="w-full rounded-xl border border-border bg-background p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
          placeholder="Share your experience..."
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Photos (optional, up to 4)</label>
        <div className="flex gap-2 flex-wrap">
          {photos.map((url, i) => (
            <div key={i} className="relative h-20 w-20 rounded-lg overflow-hidden border border-border">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {photos.length < 4 && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="h-20 w-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-[10px] mt-1">Add</span>
                </>
              )}
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <Button variant="gradient" type="submit" disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Submit Review
      </Button>
    </form>
  );
}
