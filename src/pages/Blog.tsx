import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, User, ArrowRight } from "lucide-react";
import { Layout } from "@/components/Layout";
import { SEOHead } from "@/components/SEOHead";
import { useBlogPosts, pickBlog } from "@/data/products";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Blog() {
  const { data: posts = [], isLoading } = useBlogPosts();
  const { lang, t } = useLanguage();
  const blogTitle = lang === "bn" ? "ব্লগ" : "Blog";
  const blogSub = lang === "bn"
    ? "আমাদের সর্বশেষ আর্টিকেল, টিপস এবং আপডেট।"
    : "Latest articles, tips, and updates from our team.";

  return (
    <Layout>
      <SEOHead title={blogTitle} description={blogSub} />
      <section className="py-16 md:py-24">
        <div className="container max-w-5xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">{blogTitle}</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{blogSub}</p>
          </motion.div>

          {isLoading ? (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-border bg-card animate-pulse h-80" />
              ))}
            </div>
          ) : !posts.length ? (
            <div className="text-center py-20 text-muted-foreground">
              {lang === "bn" ? "এখনো কোনো পোস্ট প্রকাশিত হয়নি।" : "No posts published yet. Check back soon!"}
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post, i) => {
                const tr = pickBlog(post, lang);
                return (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      to={`/blog/${post.slug}`}
                      className="group block rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      {post.image && post.image !== "/placeholder.svg" && (
                        <div className="aspect-video overflow-hidden">
                          <img src={post.image} alt={tr.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </div>
                      )}
                      <div className="p-5">
                        <span className="text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5">{post.category}</span>
                        <h2 className="text-lg font-semibold mt-3 mb-2 group-hover:text-primary transition-colors line-clamp-2">{tr.title}</h2>
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{tr.excerpt}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1"><User className="h-3 w-3" />{post.author}</span>
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(post.date).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US")}</span>
                          </div>
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform text-primary" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
