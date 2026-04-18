import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Calendar, User, Share2 } from "lucide-react";
import { Layout } from "@/components/Layout";
import { SEOHead } from "@/components/SEOHead";
import { useLanguage } from "@/contexts/LanguageContext";
import { pickBlog } from "@/data/products";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { lang } = useLanguage();

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug!)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container max-w-3xl mx-auto px-4 py-24">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-64 bg-muted rounded mt-8" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!post) {
    return (
      <Layout>
        <div className="container max-w-3xl mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-bold mb-4">{lang === "bn" ? "পোস্ট পাওয়া যায়নি" : "Post not found"}</h1>
          <Link to="/blog" className="text-primary hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> {lang === "bn" ? "ব্লগে ফিরে যান" : "Back to Blog"}
          </Link>
        </div>
      </Layout>
    );
  }

  const tr = pickBlog(post as any, lang);
  const ogImage = (post as any).og_image_url?.trim() || (post as any).image_url || undefined;

  return (
    <Layout>
      <SEOHead
        title={tr.meta_title?.trim() || tr.title}
        description={tr.meta_description?.trim() || tr.excerpt}
        keywords={tr.meta_keywords?.trim() || undefined}
        ogImage={ogImage}
        canonical={typeof window !== "undefined" ? window.location.href : undefined}
        type="article"
      />
      <article className="py-16 md:py-24">
        <div className="container max-w-3xl mx-auto px-4">
          <Link to="/blog" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-8">
            <ArrowLeft className="h-4 w-4" /> {lang === "bn" ? "ব্লগে ফিরে যান" : "Back to Blog"}
          </Link>

          <span className="text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5">{post.category}</span>
          <h1 className="text-3xl md:text-4xl font-display font-bold mt-3 mb-4">{tr.title}</h1>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8">
            <span className="flex items-center gap-1"><User className="h-4 w-4" />{post.author}</span>
            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{new Date(post.published_at ?? post.created_at).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US")}</span>
          </div>

          {post.image_url && (
            <img src={post.image_url} alt={tr.title} className="w-full rounded-2xl mb-10 aspect-video object-cover" />
          )}

          <div className="prose prose-lg dark:prose-invert max-w-none whitespace-pre-wrap">
            {tr.content}
          </div>

          <div className="mt-12 pt-8 border-t border-border">
            <div className="flex items-center gap-3">
              <Share2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">{lang === "bn" ? "শেয়ার" : "Share"}</span>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tr.title)}&url=${encodeURIComponent(window.location.href)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-colors"
                aria-label="Share on Twitter"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-colors"
                aria-label="Share on Facebook"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(tr.title + " " + window.location.href)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-colors"
                aria-label="Share on WhatsApp"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </article>
    </Layout>
  );
}
