import type { MetaSeoValues } from "../MetaSeoFields";

const inputClass =
  "h-10 w-full rounded-xl border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

interface Props {
  values: MetaSeoValues;
  onChange: (next: MetaSeoValues) => void;
}

export function AdvancedSeoFields({ values, onChange }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border">
      <div>
        <label className="text-xs font-medium block mb-1">Twitter / X Card Type</label>
        <select
          value={values.twitter_card || ""}
          onChange={(e) => onChange({ ...values, twitter_card: e.target.value })}
          className={inputClass}
        >
          <option value="">Auto (large image if OG image is set)</option>
          <option value="summary_large_image">Summary, Large Image</option>
          <option value="summary">Summary (small thumbnail)</option>
        </select>
        <p className="text-[10px] text-muted-foreground mt-1">
          Controls the X / Twitter preview layout.
        </p>
      </div>
      <div>
        <label className="text-xs font-medium block mb-1">Canonical URL</label>
        <input
          value={values.canonical_url || ""}
          onChange={(e) => onChange({ ...values, canonical_url: e.target.value })}
          placeholder="https://example.com/about"
          className={inputClass}
        />
        <p className="text-[10px] text-muted-foreground mt-1">
          Tells search engines &amp; social platforms the official URL.
        </p>
      </div>
    </div>
  );
}
