import type { MetaSeoValues } from "../MetaSeoFields";

const inputClass =
  "h-10 w-full rounded-xl border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary";
const textareaClass =
  "w-full rounded-xl border border-border bg-background p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]";

interface Props {
  values: MetaSeoValues;
  onChange: (next: MetaSeoValues) => void;
}

export function MetaTextFields({ values, onChange }: Props) {
  const titleLen = values.meta_title?.length ?? 0;
  const descLen = values.meta_description?.length ?? 0;

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium">Meta Title</label>
          <span className={`text-[10px] ${titleLen > 60 ? "text-destructive" : "text-muted-foreground"}`}>{titleLen}/60</span>
        </div>
        <input
          value={values.meta_title}
          onChange={(e) => onChange({ ...values, meta_title: e.target.value })}
          placeholder="Concise, keyword-rich title under 60 chars"
          className={inputClass}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium">Meta Description</label>
          <span className={`text-[10px] ${descLen > 160 ? "text-destructive" : "text-muted-foreground"}`}>{descLen}/160</span>
        </div>
        <textarea
          value={values.meta_description}
          onChange={(e) => onChange({ ...values, meta_description: e.target.value })}
          placeholder="Compelling 1-2 sentence summary under 160 chars"
          className={textareaClass}
        />
      </div>

      <div>
        <label className="text-xs font-medium block mb-1">Meta Keywords</label>
        <input
          value={values.meta_keywords}
          onChange={(e) => onChange({ ...values, meta_keywords: e.target.value })}
          placeholder="comma, separated, keywords"
          className={inputClass}
        />
      </div>
    </>
  );
}
