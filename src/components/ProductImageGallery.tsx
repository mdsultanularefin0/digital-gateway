import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProductImage {
  id: string;
  image_url: string;
  alt_text: string;
  sort_order: number;
}

export function ProductImageGallery({ productId, fallbackLetter }: { productId: string; fallbackLetter: string }) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  const { data: images } = useQuery({
    queryKey: ["product-images", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_images")
        .select("*")
        .eq("product_id", productId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as ProductImage[];
    },
  });

  if (!images || images.length === 0) {
    return (
      <div className="aspect-video overflow-hidden rounded-[4px] border border-border bg-muted flex items-center justify-center relative">
        <div className="gradient-bg opacity-10 absolute inset-0" />
        <span className="text-6xl font-display font-bold text-muted-foreground/20">{fallbackLetter}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="aspect-video overflow-hidden rounded-[4px] border border-border bg-muted relative">
        <AnimatePresence mode="wait">
          <motion.img
            key={images[selectedIdx].id}
            src={images[selectedIdx].image_url}
            alt={images[selectedIdx].alt_text || "Product image"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full object-cover"
          />
        </AnimatePresence>
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setSelectedIdx(i)}
              className={`shrink-0 w-16 h-16 rounded-[4px] overflow-hidden border-2 transition-colors ${
                i === selectedIdx ? "border-primary" : "border-border hover:border-foreground/20"
              }`}
            >
              <img src={img.image_url} alt={img.alt_text || ""} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
