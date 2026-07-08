import { useState } from "react";
import { SectionContent, LandingSection } from "@/data/landing-templates";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Upload, Loader2 } from "lucide-react";
import { uploadToStorage } from "@/lib/storage";
import { toast } from "@/hooks/use-toast";

interface Props {
  section: LandingSection;
  content: SectionContent;
  onChange: (content: SectionContent) => void;
  lang: "en" | "bn";
}

const inputCls = "h-10 w-full rounded-lg border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary";
const textareaCls = "w-full rounded-lg border border-border bg-background p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]";

const _SECTION_TYPE_LABELS: Record<string, string> = {
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
  checkout: "Checkout Form",
  "pricing-tiers": "Pricing Tiers (multi-plan grid)",
};

const showBody = ["hero", "text-image", "testimonial", "guarantee", "pricing", "product-showcase"];
const showImage = ["hero", "text-image", "product-showcase"];
const showGallery = ["product-showcase", "text-image", "testimonial"];
const showButton = ["hero", "cta", "pricing", "text-image", "checkout"];
const showPrice = ["hero", "pricing", "cta", "countdown"];
const showBadge = ["hero", "pricing", "countdown"];
const showItems = ["features", "faq", "stats", "how-it-works", "bonus", "pricing", "testimonial"];
const showCountdown = ["countdown"];
const showRatio = ["hero", "text-image", "product-showcase"];

const IMAGE_RATIOS = [
  { value: "auto", label: "Auto (original)" },
  { value: "1:1", label: "1:1 Square" },
  { value: "4:3", label: "4:3 Landscape" },
  { value: "16:9", label: "16:9 Wide" },
  { value: "3:4", label: "3:4 Portrait" },
  { value: "9:16", label: "9:16 Tall" },
];

function ImageUploadField({ value, onChange, placeholder }: { value: string; onChange: (url: string) => void; placeholder?: string }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadToStorage(file, "landing");
      onChange(result.url);
      toast({ title: "Image uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <input value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} placeholder={placeholder || "https://..."} />
      <label className="shrink-0 cursor-pointer">
        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
        <span className={`inline-flex items-center justify-center h-10 w-10 rounded-lg border border-border bg-background hover:bg-muted transition-colors ${uploading ? "opacity-50" : ""}`}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </span>
      </label>
      {value && (
        <img src={value} alt="" className="h-10 w-10 rounded border border-border object-cover shrink-0" />
      )}
    </div>
  );
}

export function SectionEditor({ section, content, onChange, lang }: Props) {
  const update = (key: keyof SectionContent, value: any) => onChange({ ...content, [key]: value });
  const langHint = lang === "bn" ? " (বাংলা)" : " (English)";

  const hasItems = showItems.includes(section.type);
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
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Image</label>
          <ImageUploadField value={content.imageUrl ?? ""} onChange={(url) => update("imageUrl", url)} placeholder="Paste URL or upload" />
        </div>
      )}

      {showRatio.includes(section.type) && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Image Aspect Ratio</label>
          <Select value={content.imageRatio || "auto"} onValueChange={(v) => update("imageRatio", v)}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {IMAGE_RATIOS.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showGallery.includes(section.type) && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground block">
            Image Gallery / Carousel (optional)
          </label>
          {(content.images || []).map((url, i) => (
            <div key={i} className="flex gap-2 items-center">
              <ImageUploadField
                value={url}
                onChange={(newUrl) => {
                  const imgs = [...(content.images || [])];
                  imgs[i] = newUrl;
                  update("images", imgs);
                }}
                placeholder={`Image #${i + 1}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => {
                  const imgs = (content.images || []).filter((_, idx) => idx !== i);
                  update("images", imgs);
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
            onClick={() => update("images", [...(content.images || []), ""])}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Image
          </Button>
          <p className="text-xs text-muted-foreground">Add multiple images to show as a carousel on the landing page.</p>
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

      {section.type === "pricing-tiers" && (
        <div className="space-y-3">
          <label className="text-xs font-medium text-muted-foreground block">Pricing Plans</label>
          {(content.plans || []).map((plan, i) => (
            <div key={i} className="rounded-lg border border-border p-3 space-y-2 bg-muted/20">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Plan #{i + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => update("plans", (content.plans || []).filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <input value={plan.name} onChange={(e) => {
                  const p = [...(content.plans || [])]; p[i] = { ...p[i], name: e.target.value }; update("plans", p);
                }} className={inputCls} placeholder="Plan name (e.g. 30 Day License)" />
                <input value={plan.tagline || ""} onChange={(e) => {
                  const p = [...(content.plans || [])]; p[i] = { ...p[i], tagline: e.target.value }; update("plans", p);
                }} className={inputCls} placeholder="Tagline (e.g. Most popular)" />
                <input value={plan.price} onChange={(e) => {
                  const p = [...(content.plans || [])]; p[i] = { ...p[i], price: e.target.value }; update("plans", p);
                }} className={inputCls} placeholder="Price (e.g. ৳499)" />
                <input value={plan.period || ""} onChange={(e) => {
                  const p = [...(content.plans || [])]; p[i] = { ...p[i], period: e.target.value }; update("plans", p);
                }} className={inputCls} placeholder="Period (e.g. 30 days)" />
                <input value={plan.buttonText || ""} onChange={(e) => {
                  const p = [...(content.plans || [])]; p[i] = { ...p[i], buttonText: e.target.value }; update("plans", p);
                }} className={inputCls} placeholder="Button text (default: Buy Now)" />
                <input value={plan.buttonUrl || ""} onChange={(e) => {
                  const p = [...(content.plans || [])]; p[i] = { ...p[i], buttonUrl: e.target.value }; update("plans", p);
                }} className={inputCls} placeholder="Button URL (blank = scroll to checkout)" />
              </div>
              <textarea
                value={(plan.features || []).join("\n")}
                onChange={(e) => {
                  const p = [...(content.plans || [])];
                  p[i] = { ...p[i], features: e.target.value.split("\n") };
                  update("plans", p);
                }}
                className={textareaCls}
                placeholder="Features — one per line"
              />
              <label className="flex items-center gap-2 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={!!plan.highlight}
                  onChange={(e) => {
                    const p = [...(content.plans || [])]; p[i] = { ...p[i], highlight: e.target.checked }; update("plans", p);
                  }}
                />
                Highlight this plan (Most Popular badge)
              </label>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => update("plans", [...(content.plans || []), { name: "", price: "", features: [] }])}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Plan
          </Button>
        </div>
      )}
    </div>
  );
}
