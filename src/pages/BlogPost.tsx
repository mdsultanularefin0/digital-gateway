import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Calendar, User, Share2 } from "lucide-react";
import { Layout } from "@/components/Layout";
import { SEOHead } from "@/components/SEOHead";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();

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
          <h1 className="text-2xl font-bold mb-4">Post not found</h1>
          <Link to="/blog" className="text-primary hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to Blog
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEOHead title={post.title} description={post.excerpt} />
      <article className="py-16 md:py-24">
        <div className="container max-w-3xl mx-auto px-4">
          <Link to="/blog" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-8">
            <ArrowLeft className="h-4 w-4" /> Back to Blog
          </Link>

          <span className="text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5">{post.category}</span>
          <h1 className="text-3xl md:text-4xl font-display font-bold mt-3 mb-4">{post.title}</h1>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8">
            <span className="flex items-center gap-1"><User className="h-4 w-4" />{post.author}</span>
            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{new Date(post.published_at ?? post.created_at).toLocaleDateString()}</span>
          </div>

          {post.image_url && (
            <img src={post.image_url} alt={post.title} className="w-full rounded-2xl mb-10 aspect-video object-cover" />
          )}

          <div className="prose prose-lg dark:prose-invert max-w-none whitespace-pre-wrap">
            {post.content}
          </div>
        </div>
      </article>
    </Layout>
  );
}
