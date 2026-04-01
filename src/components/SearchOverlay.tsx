import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ArrowRight } from "lucide-react";
import { useProducts } from "@/data/products";

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { data: products } = useProducts();

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Cmd/Ctrl+K to open (handled by parent, but we listen for close)
  const filtered = products?.filter((p) => {
    if (!query.trim()) return false;
    const q = query.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.tagline.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }) ?? [];

  const goToProduct = useCallback(
    (id: string) => {
      onClose();
      navigate(`/products/${id}`);
    },
    [navigate, onClose]
  );

  const goToProducts = useCallback(() => {
    onClose();
    navigate("/products");
  }, [navigate, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed left-4 right-4 top-20 z-[61] mx-auto max-w-xl"
          >
            <div className="rounded-xl border border-border/60 bg-background shadow-2xl overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 px-5">
                <Search className="h-5 w-5 text-muted-foreground shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products..."
                  className="flex-1 h-12 bg-transparent text-base font-body outline-none placeholder:text-muted-foreground/60"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && filtered.length > 0) {
                      goToProduct(filtered[0].id);
                    }
                  }}
                />
                <button
                  onClick={onClose}
                  className="flex h-7 w-7 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Results - only show when there's a query */}
              {query.trim() !== "" && (
                <div className="max-h-[40vh] overflow-y-auto border-t border-border/40">
                  {filtered.length === 0 ? (
                    <div className="px-5 py-6 text-center">
                      <p className="text-sm text-muted-foreground">
                        No results for "<span className="text-foreground font-medium">{query}</span>"
                      </p>
                      <button
                        onClick={goToProducts}
                        className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1"
                      >
                        Browse all products <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="py-2">
                      <p className="px-5 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                      </p>
                      {filtered.slice(0, 8).map((product) => (
                        <button
                          key={product.id}
                          onClick={() => goToProduct(product.id)}
                          className="w-full flex items-center gap-4 px-5 py-3 hover:bg-muted/40 transition-colors text-left group"
                        >
                          <div className="h-11 w-11 rounded-xl bg-muted/50 border border-border/40 overflow-hidden shrink-0">
                            <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{product.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{product.tagline}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-foreground">{product.priceLabel}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{product.category}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
