import { useState } from "react";
import { Loader2 } from "lucide-react";
import { uploadToStorage } from "@/lib/storage";
import { toast } from "@/hooks/use-toast";
import type { MetaSeoValues } from "../MetaSeoFields";

const inputClass =
  "h-10 w-full rounded-xl border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

interface Props {
  values: MetaSeoValues;
  onChange: (next: MetaSeoValues) => void;
}

export function OgImagePicker({ values, onChange }: Props) {
  const [uploading, setUploading] = useState(false);

  const handleOgUpload = async (file: File) => {
    setUploading(true);
    try {
      const { url } = await uploadToStorage(file, "products");
      onChange({ ...values, og_image_url: url });
      toast({ title: "OG image uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="text-xs font-medium block mb-1">Open Graph Image (social share)</label>
      <p className="text-[10px] text-muted-foreground mb-2">Recommended: 1200×630 JPG/PNG, under 5 MB.</p>
      <div className="flex gap-2 items-start flex-wrap">
        {values.og_image_url ? (
          <div className="relative">
            <img src={values.og_image_url} alt="OG preview" className="h-20 w-36 object-cover rounded-lg border border-border" />
            <button
              type="button"
              onClick={() => onChange({ ...values, og_image_url: "" })}
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center"
              title="Remove"
            >
              ×
            </button>
          </div>
        ) : null}
        <div className="flex-1 min-w-[200px] space-y-2">
          <input
            value={values.og_image_url || ""}
            onChange={(e) => onChange({ ...values, og_image_url: e.target.value })}
            placeholder="Paste image URL or upload below"
            className={inputClass}
          />
          <label className="inline-flex items-center gap-2 text-xs cursor-pointer rounded-lg border border-dashed border-border px-3 py-1.5 hover:border-primary/50">
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Upload image"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleOgUpload(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
