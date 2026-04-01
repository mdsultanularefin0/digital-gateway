import { SectionContent, LandingSection } from "@/data/landing-templates";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  section: LandingSection;
  content: SectionContent;
  onChange: (content: SectionContent) => void;
  lang: "en" | "bn";
}

const inputCls = "h-10 w-full rounded-lg border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary";
const textareaCls = "w-full rounded-lg border border-border bg-background p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]";

const SECTION_TYPE_LABELS: Record<string, string> = {
  hero: "Hero Banner",
  features: "Features / Benefits",
  cta: "Call to Action",
  testimonial: "Testimonials",
  stats: "Statistics",
  faq: "FAQ",
  "text-image": "Text + Image",
  pricing: "Pricing Card",
  "how-it-works": "How It Works (Steps)",
  guarantee: "Guarantee / Trust",
  "product-showcase": "Product Showcase",
  bonus: "Bonus Content",
  countdown: "Countdown Timer",
};

// Which section types show which fields
const showBody = ["hero", "text-image", "testimonial", "guarantee", "pricing", "product-showcase"];
const showImage = ["hero", "text-image", "product-showcase"];
const showButton = ["hero", "cta", "pricing", "text-image"];
const showPrice = ["hero", "pricing", "cta", "countdown"];
const showBadge = ["hero", "pricing", "countdown"];
const showItems = ["features", "faq", "stats", "how-it-works", "bonus", "pricing", "testimonial"];
const showCountdown = ["countdown"];

export function SectionEditor({ section, content, onChange, lang }: Props) {
  const update = (key: keyof SectionContent, value: any) => onChange({ ...content, [key]: value });
  const langHint = lang === "bn" ? " (বাংলা)" : " (English)";

  const hasItems = showItems.includes(section.type);
  // Initialize items if this section type needs them but doesn't have any
  if (hasItems && !content.items) {
    content = { ...content, items: [{ title: "", description: "" }, { title: "", description: "" }, { title: "", description: "" }] };
  }

  const itemLabels: Record<string, { title: string; desc: string }> = {
    features: { title: "Feature Name", desc: "Feature Description" },
    faq: { title: "Question", desc: "Answer" },
    stats: { title: "Number / Value", desc: "Label" },
    "how-it-works": { title: "Step Title", desc: "Step Description" },
    bonus: { title: "Bonus Name", desc: "Bonus Description" },
    pricing: { title: "Included Feature", desc: "Details (optional)" },
    testimonial: { title: "Customer Name", desc: "Their Review" },
  };

  const labels = itemLabels[section.type] || { title: "Title", desc: "Description" };

  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <h4 className="font-semibold text-sm flex items-center gap-2">
        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs uppercase">{section.type}</span>
        {section.label}{langHint}
      </h4>

      {showBadge.includes(section.type) && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Badge / Tag (optional)</label>
          <input value={content.badge ?? ""} onChange={(e) => update("badge", e.target.value)} className={inputCls} placeholder="e.g. Limited Offer, Bestseller" />
        </div>
      )}

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Heading</label>
        <input value={content.heading ?? ""} onChange={(e) => update("heading", e.target.value)} className={inputCls} />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Subheading</label>
        <input value={content.subheading ?? ""} onChange={(e) => update("subheading", e.target.value)} className={inputCls} />
      </div>

      {showBody.includes(section.type) && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Body Text</label>
          <textarea value={content.body ?? ""} onChange={(e) => update("body", e.target.value)} className={textareaCls} />
        </div>
      )}

      {showImage.includes(section.type) && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Image URL</label>
          <input value={content.imageUrl ?? ""} onChange={(e) => update("imageUrl", e.target.value)} className={inputCls} placeholder="https://..." />
        </div>
      )}

      {showPrice.includes(section.type) && (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Price</label>
            <input value={content.price ?? ""} onChange={(e) => update("price", e.target.value)} className={inputCls} placeholder="৳999" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Original Price (strikethrough)</label>
            <input value={content.originalPrice ?? ""} onChange={(e) => update("originalPrice", e.target.value)} className={inputCls} placeholder="৳1999" />
          </div>
        </div>
      )}

      {showCountdown.includes(section.type) && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Countdown End Date & Time</label>
          <input
            type="datetime-local"
            value={content.countdownDate ?? ""}
            onChange={(e) => update("countdownDate", e.target.value)}
            className={inputCls}
          />
          <p className="text-xs text-muted-foreground mt-1">The timer will count down to this date/time</p>
        </div>
      )}

      {showButton.includes(section.type) && (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Button Text</label>
            <input value={content.buttonText ?? ""} onChange={(e) => update("buttonText", e.target.value)} className={inputCls} placeholder="Buy Now" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Button URL</label>
            <input value={content.buttonUrl ?? ""} onChange={(e) => update("buttonUrl", e.target.value)} className={inputCls} placeholder="/products/my-product" />
          </div>
        </div>
      )}

      {hasItems && content.items && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground block">
            {section.type === "testimonial" ? "Customer Reviews" : section.type === "pricing" ? "Included Features" : "Items"}
          </label>
          {content.items.map((item, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1 space-y-1">
                <input
                  value={item.title}
                  onChange={(e) => {
                    const items = [...content.items!];
                    items[i] = { ...items[i], title: e.target.value };
                    update("items", items);
                  }}
                  className={inputCls}
                  placeholder={labels.title}
                />
                <input
                  value={item.description}
                  onChange={(e) => {
                    const items = [...content.items!];
                    items[i] = { ...items[i], description: e.target.value };
                    update("items", items);
                  }}
                  className={inputCls}
                  placeholder={labels.desc}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 mt-1"
                onClick={() => {
                  const items = content.items!.filter((_, idx) => idx !== i);
                  update("items", items);
                }}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => update("items", [...(content.items || []), { title: "", description: "" }])}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
          </Button>
        </div>
      )}
    </div>
  );
}
