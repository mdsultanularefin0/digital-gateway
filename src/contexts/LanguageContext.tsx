import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type Lang = "en" | "bn";

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const translations: Record<string, Record<Lang, string>> = {
  // Nav
  "nav.products": { en: "Products", bn: "পণ্য" },
  "nav.about": { en: "About", bn: "সম্পর্কে" },
  "nav.contact": { en: "Contact", bn: "যোগাযোগ" },
  "nav.profile": { en: "Profile", bn: "প্রোফাইল" },
  "nav.search": { en: "Search", bn: "অনুসন্ধান" },

  // Product
  "product.viewDetails": { en: "View Details", bn: "বিস্তারিত দেখুন" },
  "product.addToCart": { en: "Add to Cart", bn: "কার্টে যোগ করুন" },
  "product.features": { en: "Features", bn: "বৈশিষ্ট্য" },
  "product.reviews": { en: "Reviews", bn: "রিভিউ" },
  "product.faq": { en: "FAQ", bn: "প্রশ্নোত্তর" },
  "product.inStock": { en: "In Stock", bn: "স্টকে আছে" },
  "product.outOfStock": { en: "Out of Stock", bn: "স্টকে নেই" },
  "product.getAccess": { en: "Get Access Now", bn: "এখনই অ্যাক্সেস নিন" },

  // Home
  "home.hero.title": { en: "Premium Digital Products", bn: "প্রিমিয়াম ডিজিটাল পণ্য" },
  "home.hero.subtitle": { en: "Curated tools and subscriptions for professionals", bn: "পেশাদারদের জন্য নির্বাচিত টুলস ও সাবস্ক্রিপশন" },
  "home.featured": { en: "Featured Products", bn: "বিশেষ পণ্য" },
  "home.browseAll": { en: "Browse All Products", bn: "সব পণ্য দেখুন" },

  // Footer
  "footer.rights": { en: "All rights reserved.", bn: "সর্বস্বত্ব সংরক্ষিত।" },
  "footer.privacy": { en: "Privacy", bn: "গোপনীয়তা" },
  "footer.terms": { en: "Terms", bn: "শর্তাবলী" },

  // Common
  "common.loading": { en: "Loading...", bn: "লোড হচ্ছে..." },
  "common.noResults": { en: "No results found", bn: "কোনো ফলাফল পাওয়া যায়নি" },
  "common.submit": { en: "Submit", bn: "জমা দিন" },
  "common.cancel": { en: "Cancel", bn: "বাতিল" },

  // About
  "about.title": { en: "About Us", bn: "আমাদের সম্পর্কে" },

  // Contact
  "contact.title": { en: "Contact Us", bn: "যোগাযোগ করুন" },
  "contact.name": { en: "Your Name", bn: "আপনার নাম" },
  "contact.email": { en: "Email Address", bn: "ইমেইল ঠিকানা" },
  "contact.message": { en: "Message", bn: "বার্তা" },
  "contact.send": { en: "Send Message", bn: "বার্তা পাঠান" },

  // Cart
  "cart.title": { en: "Shopping Cart", bn: "শপিং কার্ট" },
  "cart.empty": { en: "Your cart is empty", bn: "আপনার কার্ট খালি" },
  "cart.checkout": { en: "Checkout", bn: "চেকআউট" },
  "cart.total": { en: "Total", bn: "মোট" },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem("lang") as Lang) || "en";
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("lang", l);
  }, []);

  const t = useCallback(
    (key: string) => translations[key]?.[lang] || translations[key]?.en || key,
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
