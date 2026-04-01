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

export function SectionEditor({ section, content, onChange, lang }: Props) {
  const update = (key: keyof SectionContent, value: any) => onChange({ ...content, [key]: value });
  const langHint = lang === "bn" ? " (বাংলা)" : " (English)";

  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <h4 className="font-semibold text-sm flex items-center gap-2">
        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs uppercase">{section.type}</span>
        {section.label}{langHint}
      </h4>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Heading</label>
        <input value={content.heading ?? ""} onChange={(e) => update("heading", e.target.value)} className={inputCls} />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Subheading</label>
        <input value={content.subheading ?? ""} onChange={(e) => update("subheading", e.target.value)} className={inputCls} />
      </div>

      {(section.type === "hero" || section.type === "text-image" || section.type === "testimonial") && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Body Text</label>
          <textarea value={content.body ?? ""} onChange={(e) => update("body", e.target.value)} className={textareaCls} />
        </div>
      )}

      {(section.type === "hero" || section.type === "text-image") && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Image URL</label>
          <input value={content.imageUrl ?? ""} onChange={(e) => update("imageUrl", e.target.value)} className={inputCls} placeholder="https://..." />
        </div>
      )}

      {(section.type === "hero" || section.type === "cta") && (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Button Text</label>
            <input value={content.buttonText ?? ""} onChange={(e) => update("buttonText", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Button URL</label>
            <input value={content.buttonUrl ?? ""} onChange={(e) => update("buttonUrl", e.target.value)} className={inputCls} />
          </div>
        </div>
      )}

      {content.items && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground block">Items</label>
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
                  placeholder="Title"
                />
                <input
                  value={item.description}
                  onChange={(e) => {
                    const items = [...content.items!];
                    items[i] = { ...items[i], description: e.target.value };
                    update("items", items);
                  }}
                  className={inputCls}
                  placeholder="Description"
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
