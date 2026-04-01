export interface LandingSection {
  id: string;
  type:
    | "hero"
    | "features"
    | "cta"
    | "testimonial"
    | "stats"
    | "faq"
    | "text-image"
    | "pricing"
    | "how-it-works"
    | "guarantee"
    | "product-showcase"
    | "bonus"
    | "countdown"
    | "checkout";
  label: string;
}

export interface LandingTemplate {
  id: string;
  name: string;
  nameBn: string;
  description: string;
  sections: LandingSection[];
  preview: string;
}

export interface SectionContent {
  heading?: string;
  subheading?: string;
  body?: string;
  buttonText?: string;
  buttonUrl?: string;
  imageUrl?: string;
  items?: { title: string; description: string; icon?: string }[];
  price?: string;
  originalPrice?: string;
  badge?: string;
  countdownDate?: string;
  productName?: string;
}

export type SectionsData = Record<string, SectionContent>;

export const landingTemplates: LandingTemplate[] = [
  {
    id: "digital-sales",
    name: "Digital Product Sales",
    nameBn: "ডিজিটাল প্রোডাক্ট সেলস",
    description: "High-converting page for selling ebooks, courses, templates, software, or any digital product",
    preview: "💎",
    sections: [
      { id: "hero", type: "hero", label: "Product Hero" },
      { id: "product-showcase", type: "product-showcase", label: "Product Showcase" },
      { id: "features", type: "features", label: "What You Get" },
      { id: "how-it-works", type: "how-it-works", label: "How It Works" },
      { id: "testimonial", type: "testimonial", label: "Customer Reviews" },
      { id: "countdown", type: "countdown", label: "Limited Time Offer" },
      { id: "pricing", type: "pricing", label: "Pricing" },
      { id: "guarantee", type: "guarantee", label: "Money-Back Guarantee" },
      { id: "faq", type: "faq", label: "FAQ" },
      { id: "cta", type: "cta", label: "Final CTA" },
      { id: "checkout", type: "checkout", label: "Checkout" },
    ],
  },
  {
    id: "ebook-landing",
    name: "Ebook / Guide",
    nameBn: "ইবুক / গাইড",
    description: "Perfect for selling ebooks, PDF guides, cheat sheets, or checklists",
    preview: "📖",
    sections: [
      { id: "hero", type: "hero", label: "Ebook Hero" },
      { id: "text-image", type: "text-image", label: "About the Book" },
      { id: "features", type: "features", label: "What's Inside" },
      { id: "bonus", type: "bonus", label: "Bonus Content" },
      { id: "testimonial", type: "testimonial", label: "Reader Reviews" },
      { id: "countdown", type: "countdown", label: "Limited Time Offer" },
      { id: "pricing", type: "pricing", label: "Get Your Copy" },
      { id: "guarantee", type: "guarantee", label: "Guarantee" },
      { id: "faq", type: "faq", label: "FAQ" },
      { id: "cta", type: "cta", label: "Download Now" },
      { id: "checkout", type: "checkout", label: "Checkout" },
    ],
  },
  {
    id: "course-landing",
    name: "Online Course",
    nameBn: "অনলাইন কোর্স",
    description: "Sell online courses, masterclasses, tutorials, or coaching programs",
    preview: "🎓",
    sections: [
      { id: "hero", type: "hero", label: "Course Hero" },
      { id: "stats", type: "stats", label: "Course Stats" },
      { id: "features", type: "features", label: "Course Modules" },
      { id: "how-it-works", type: "how-it-works", label: "How to Enroll" },
      { id: "bonus", type: "bonus", label: "Bonus Materials" },
      { id: "testimonial", type: "testimonial", label: "Student Results" },
      { id: "pricing", type: "pricing", label: "Pricing Plans" },
      { id: "guarantee", type: "guarantee", label: "Guarantee" },
      { id: "faq", type: "faq", label: "FAQ" },
      { id: "cta", type: "cta", label: "Enroll Now" },
      { id: "checkout", type: "checkout", label: "Checkout" },
    ],
  },
  {
    id: "software-saas",
    name: "Software / SaaS",
    nameBn: "সফটওয়্যার / SaaS",
    description: "Sell software licenses, SaaS subscriptions, plugins, or digital tools",
    preview: "⚡",
    sections: [
      { id: "hero", type: "hero", label: "Product Hero" },
      { id: "product-showcase", type: "product-showcase", label: "Product Demo" },
      { id: "features", type: "features", label: "Key Features" },
      { id: "stats", type: "stats", label: "By the Numbers" },
      { id: "how-it-works", type: "how-it-works", label: "Get Started" },
      { id: "testimonial", type: "testimonial", label: "User Reviews" },
      { id: "pricing", type: "pricing", label: "Pricing" },
      { id: "faq", type: "faq", label: "FAQ" },
      { id: "cta", type: "cta", label: "Start Now" },
    ],
  },
  {
    id: "template-toolkit",
    name: "Template / Toolkit",
    nameBn: "টেমপ্লেট / টুলকিট",
    description: "Sell design templates, Notion templates, toolkits, or digital assets",
    preview: "🎨",
    sections: [
      { id: "hero", type: "hero", label: "Template Hero" },
      { id: "product-showcase", type: "product-showcase", label: "Preview Gallery" },
      { id: "features", type: "features", label: "What's Included" },
      { id: "bonus", type: "bonus", label: "Bonus Assets" },
      { id: "testimonial", type: "testimonial", label: "Testimonials" },
      { id: "pricing", type: "pricing", label: "Get the Bundle" },
      { id: "guarantee", type: "guarantee", label: "Guarantee" },
      { id: "cta", type: "cta", label: "Buy Now" },
    ],
  },
  {
    id: "coming-soon",
    name: "Coming Soon / Waitlist",
    nameBn: "শীঘ্রই আসছে",
    description: "Build hype before launch — collect emails and tease your upcoming digital product",
    preview: "⏳",
    sections: [
      { id: "hero", type: "hero", label: "Coming Soon Hero" },
      { id: "features", type: "features", label: "Sneak Peek" },
      { id: "faq", type: "faq", label: "FAQ" },
      { id: "cta", type: "cta", label: "Join Waitlist" },
    ],
  },
];

export function getDefaultSections(template: LandingTemplate): SectionsData {
  const data: SectionsData = {};
  for (const s of template.sections) {
    const hasItems = ["features", "faq", "stats", "how-it-works", "bonus"].includes(s.type);
    const hasCountdown = s.type === "countdown";
    data[s.id] = {
      heading: "",
      subheading: "",
      body: "",
      buttonText: "",
      buttonUrl: "",
      imageUrl: "",
      price: "",
      originalPrice: "",
      badge: "",
      countdownDate: hasCountdown ? "" : undefined,
      items: hasItems
        ? [
            { title: "", description: "" },
            { title: "", description: "" },
            { title: "", description: "" },
          ]
        : undefined,
    };
  }
  return data;
}
