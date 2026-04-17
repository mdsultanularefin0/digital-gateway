import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type DBProduct = Database["public"]["Tables"]["products"]["Row"];

export interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  tags: string[];
  price: number;
  priceLabel: string;
  billingCycle?: string;
  features: string[];
  image: string;
  externalUrl: string;
  featured: boolean;
  inStock: boolean;
  testimonials: { name: string; role: string; quote: string }[];
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  og_image_url?: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  billingCycle: string;
  features: string[];
  highlighted: boolean;
  externalUrl: string;
  badge?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  category: string;
  image: string;
  slug: string;
  content?: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

function mapDBProduct(p: DBProduct): Product {
  return {
    id: p.id,
    slug: (p as any).slug || p.id,
    name: p.name,
    tagline: p.tagline,
    description: p.description,
    category: p.category,
    tags: Array.isArray(p.tags) ? p.tags : [],
    price: Number(p.price),
    priceLabel: p.price_label,
    billingCycle: p.billing_cycle ?? undefined,
    features: Array.isArray(p.features) ? p.features : [],
    image: p.image_url || "/placeholder.svg",
    externalUrl: p.external_url,
    featured: p.featured,
    inStock: (p as any).in_stock !== false,
    testimonials: [],
    meta_title: (p as any).meta_title || "",
    meta_description: (p as any).meta_description || "",
    meta_keywords: (p as any).meta_keywords || "",
    og_image_url: (p as any).og_image_url || "",
  };
}

export function useProducts() {
  return useQuery({
    queryKey: ["public-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as DBProduct[]).map(mapDBProduct);
    },
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["public-product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return data ? mapDBProduct(data) : null;
    },
  });
}

export function useProductBySlug(slug: string) {
  return useQuery({
    queryKey: ["public-product-slug", slug],
    queryFn: async () => {
      // Try slug first, fall back to id for backward compatibility
      const { data: rows, error } = await supabase
        .from("products")
        .select("*")
        .eq("published", true);
      if (error) throw error;
      const allProducts = rows as DBProduct[];
      let match = allProducts.find((p) => (p as any).slug === slug);
      if (!match) match = allProducts.find((p) => p.id === slug);
      const data = match || null;
      if (error) throw error;
      return data ? mapDBProduct(data) : null;
    },
    enabled: !!slug,
  });
}

export interface BlogPostRaw extends BlogPost {
  title_bn?: string | null;
  excerpt_bn?: string | null;
  content_bn?: string | null;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  meta_title_bn?: string;
  meta_description_bn?: string;
  meta_keywords_bn?: string;
  og_image_url?: string;
}

export function useBlogPosts() {
  return useQuery({
    queryKey: ["public-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("published", true)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((p: any): BlogPostRaw => ({
        id: p.id,
        title: p.title,
        excerpt: p.excerpt,
        date: p.published_at ?? p.created_at,
        author: p.author,
        category: p.category,
        image: p.image_url || "/placeholder.svg",
        slug: p.slug,
        content: p.content,
        title_bn: p.title_bn,
        excerpt_bn: p.excerpt_bn,
        content_bn: p.content_bn,
        meta_title: p.meta_title,
        meta_description: p.meta_description,
        meta_keywords: p.meta_keywords,
        meta_title_bn: p.meta_title_bn,
        meta_description_bn: p.meta_description_bn,
        meta_keywords_bn: p.meta_keywords_bn,
        og_image_url: p.og_image_url,
      }));
    },
  });
}

/** Pick the right blog field based on language, with EN fallback. */
export function pickBlog<T extends { title: string; excerpt: string; content?: string; title_bn?: string | null; excerpt_bn?: string | null; content_bn?: string | null; meta_title?: string; meta_description?: string; meta_keywords?: string; meta_title_bn?: string; meta_description_bn?: string; meta_keywords_bn?: string }>(p: T, lang: "en" | "bn") {
  if (lang === "en") {
    return {
      title: p.title,
      excerpt: p.excerpt,
      content: p.content || "",
      meta_title: p.meta_title || "",
      meta_description: p.meta_description || "",
      meta_keywords: p.meta_keywords || "",
    };
  }
  return {
    title: p.title_bn?.trim() || p.title,
    excerpt: p.excerpt_bn?.trim() || p.excerpt,
    content: p.content_bn?.trim() || p.content || "",
    meta_title: p.meta_title_bn?.trim() || p.meta_title || "",
    meta_description: p.meta_description_bn?.trim() || p.meta_description || "",
    meta_keywords: p.meta_keywords_bn?.trim() || p.meta_keywords || "",
  };
}

// Static data kept for pricing and FAQs (not in DB)
export const pricingPlans: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "Perfect for individuals and small projects",
    price: 0,
    billingCycle: "forever",
    features: ["1 project", "Basic analytics", "Community support", "5GB storage", "Standard integrations"],
    highlighted: false,
    externalUrl: "https://example.com/signup/starter",
  },
  {
    id: "pro",
    name: "Pro",
    description: "For growing teams and businesses",
    price: 29,
    billingCycle: "month",
    features: ["Unlimited projects", "Advanced analytics", "Priority support", "100GB storage", "All integrations", "Custom domains", "Team collaboration", "API access"],
    highlighted: true,
    externalUrl: "https://example.com/signup/pro",
    badge: "Most Popular",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For large organizations with custom needs",
    price: 99,
    billingCycle: "month",
    features: ["Everything in Pro", "Unlimited storage", "Dedicated support", "Custom integrations", "SLA guarantee", "SSO & SAML", "Audit logs", "Custom contracts"],
    highlighted: false,
    externalUrl: "https://example.com/contact/enterprise",
  },
];

export const faqs: FAQ[] = [
  { question: "How do subscriptions work?", answer: "All subscriptions are managed through our trusted payment partners. When you click 'Get Access' or 'Subscribe', you'll be redirected to a secure payment page where you can complete your purchase." },
  { question: "Can I cancel my subscription anytime?", answer: "Yes! All our subscriptions are flexible. You can cancel anytime through the payment platform where you subscribed, and you'll continue to have access until the end of your billing period." },
  { question: "Do you offer refunds?", answer: "We offer a 30-day money-back guarantee on all subscriptions. If you're not satisfied, contact our support team for a full refund." },
  { question: "Can I switch between plans?", answer: "Absolutely. You can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle." },
  { question: "Is there a free trial?", answer: "Yes, most of our products offer a 14-day free trial. No credit card required to start." },
  { question: "How do I get support?", answer: "We offer email support for all users, priority support for Pro users, and dedicated support for Enterprise customers. You can also visit our help center for self-service resources." },
  { question: "Are there any setup fees?", answer: "No setup fees for any plan. You only pay the subscription price listed on our pricing page." },
  { question: "Do you offer discounts for annual billing?", answer: "Yes! Save up to 20% when you choose annual billing. The discount is automatically applied at checkout." },
];

export const categories = ["All", "Design", "Analytics", "Development", "Marketing", "Security", "Productivity"];
