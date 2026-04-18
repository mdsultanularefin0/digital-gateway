import { useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { useProducts, categories } from "@/data/products";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProductTranslator } from "@/hooks/use-product-translation";

export default function ProductsPage() {
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const { data: products = [], isLoading } = useProducts();
  const { t, lang } = useLanguage();
  const { tr } = useProductTranslator();

  const q = search.toLowerCase();
  const filtered = products.filter((p) => {
    const matchCat = category === "All" || p.category === category;
    const trans = tr(p as any) as typeof p;
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.tagline.toLowerCase().includes(q) ||
      trans.name.toLowerCase().includes(q) ||
      trans.tagline.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  return (
    <Layout>
      <section className="py-16 md:py-24">
        <div className="container px-5 md:px-8">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h1 className="text-3xl font-display font-bold md:text-5xl">{t("product.all_products")}</h1>
            <p className="mt-4 text-muted-foreground">
              {lang === "bn"
                ? "আমাদের প্রিমিয়াম ডিজিটাল টুল ও সার্ভিসের সংগ্রহ ব্রাউজ করুন।"
                : "Browse our collection of premium digital tools and services."}
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-4 mb-10 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`rounded-xl px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                    category === cat
                      ? "gradient-bg text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("product.search_placeholder")}
                className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary md:w-64"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="py-20 text-center text-muted-foreground">{t("common.loading")}</div>
          ) : (
            <>
              <div className="grid gap-3 sm:gap-5 md:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {filtered.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <ProductCard product={p} />
                  </motion.div>
                ))}
              </div>
              {filtered.length === 0 && (
                <div className="py-20 text-center text-muted-foreground">{t("product.no_results")}</div>
              )}
            </>
          )}
        </div>
      </section>
    </Layout>
  );
}
