import { useState, useEffect } from "react";
import { X, Gift } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const STORAGE_KEY = "welcome-popup-shown";

export function WelcomePopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const shown = localStorage.getItem(STORAGE_KEY);
    if (!shown) {
      const timer = setTimeout(() => setOpen(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const close = () => {
    setOpen(false);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={close}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-card border border-border rounded-lg shadow-2xl max-w-sm w-full p-8 text-center"
          >
            <button onClick={close} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-5">
              <Gift className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Welcome! 🎉</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Explore our premium digital products — tools built for speed, precision, and simplicity.
            </p>
            <Button variant="gradient" className="w-full" asChild onClick={close}>
              <Link to="/products">Browse Products</Link>
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
