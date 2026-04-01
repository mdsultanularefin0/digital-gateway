export interface LandingSection {
  id: string;
  type: "hero" | "features" | "cta" | "testimonial" | "stats" | "faq" | "text-image";
  label: string;
}

export interface LandingTemplate {
  id: string;
  name: string;
  nameBn: string;
  description: string;
  sections: LandingSection[];
  preview: string; // emoji for visual hint
}

export interface SectionContent {
  heading?: string;
  subheading?: string;
  body?: string;
  buttonText?: string;
  buttonUrl?: string;
  imageUrl?: string;
  items?: { title: string; description: string }[];
}

export type SectionsData = Record<string, SectionContent>;

export const landingTemplates: LandingTemplate[] = [
  {
    id: "hero-features",
    name: "Hero + Features",
    nameBn: "হিরো + ফিচারস",
    description: "A bold hero section followed by a feature grid and a CTA",
    preview: "🚀",
    sections: [
      { id: "hero", type: "hero", label: "Hero Banner" },
      { id: "features", type: "features", label: "Features Grid" },
      { id: "cta", type: "cta", label: "Call to Action" },
    ],
  },
  {
    id: "product-launch",
    name: "Product Launch",
    nameBn: "প্রোডাক্ট লঞ্চ",
    description: "Showcase a product with image, stats, testimonials and CTA",
    preview: "🎯",
    sections: [
      { id: "hero", type: "hero", label: "Product Hero" },
      { id: "text-image", type: "text-image", label: "Product Details" },
      { id: "stats", type: "stats", label: "Key Stats" },
      { id: "testimonial", type: "testimonial", label: "Testimonials" },
      { id: "cta", type: "cta", label: "Buy Now CTA" },
    ],
  },
  {
    id: "coming-soon",
    name: "Coming Soon",
    nameBn: "শীঘ্রই আসছে",
    description: "A teaser page with hero, FAQ and email capture CTA",
    preview: "⏳",
    sections: [
      { id: "hero", type: "hero", label: "Coming Soon Hero" },
      { id: "faq", type: "faq", label: "FAQ Section" },
      { id: "cta", type: "cta", label: "Notify Me CTA" },
    ],
  },
  {
    id: "services",
    name: "Services Overview",
    nameBn: "সেবা সমূহ",
    description: "Highlight services with features, text/image blocks and CTA",
    preview: "💼",
    sections: [
      { id: "hero", type: "hero", label: "Services Hero" },
      { id: "features", type: "features", label: "Our Services" },
      { id: "text-image", type: "text-image", label: "Why Choose Us" },
      { id: "testimonial", type: "testimonial", label: "Client Testimonials" },
      { id: "cta", type: "cta", label: "Get Started" },
    ],
  },
];

export function getDefaultSections(template: LandingTemplate): SectionsData {
  const data: SectionsData = {};
  for (const s of template.sections) {
    data[s.id] = {
      heading: "",
      subheading: "",
      body: "",
      buttonText: "",
      buttonUrl: "",
      imageUrl: "",
      items: s.type === "features" || s.type === "faq" || s.type === "stats"
        ? [{ title: "", description: "" }, { title: "", description: "" }, { title: "", description: "" }]
        : undefined,
    };
  }
  return data;
}
