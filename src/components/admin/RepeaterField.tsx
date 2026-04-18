import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, GripVertical } from "lucide-react";

export interface RepeaterFieldDef {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "textarea";
}

interface RepeaterFieldProps {
  /** JSON string stored in DB */
  value: string;
  onChange: (jsonString: string) => void;
  fields: RepeaterFieldDef[];
  itemLabel?: string;
  /** Optional defaults applied to a new item */
  defaultItem?: Record<string, string>;
  maxItems?: number;
  /** Optional toolbar (e.g. AI Generate button) shown above the items */
  toolbar?: React.ReactNode;
}

function safeParse(value: string): Record<string, string>[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map((it) => ({ ...it }));
  } catch {
    /* ignore */
  }
  return [];
}

export function RepeaterField({
  value,
  onChange,
  fields,
  itemLabel = "Item",
  defaultItem,
  maxItems,
  toolbar,
}: RepeaterFieldProps) {
  const items = useMemo(() => safeParse(value), [value]);

  const commit = (next: Record<string, string>[]) => {
    onChange(JSON.stringify(next, null, 2));
  };

  const updateItem = (index: number, key: string, val: string) => {
    const next = items.map((it, i) => (i === index ? { ...it, [key]: val } : it));
    commit(next);
  };

  const addItem = () => {
    const blank: Record<string, string> = {};
    fields.forEach((f) => (blank[f.key] = ""));
    commit([...items, { ...blank, ...defaultItem }]);
  };

  const removeItem = (index: number) => {
    commit(items.filter((_, i) => i !== index));
  };

  const moveItem = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  };

  const canAdd = !maxItems || items.length < maxItems;

  return (
    <div className="space-y-3">
      {toolbar && <div className="flex justify-end">{toolbar}</div>}

      {items.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No items yet. Click "Add {itemLabel}" to create one.
        </div>
      )}

      {items.map((item, index) => (
        <div
          key={index}
          className="rounded-lg border border-border bg-muted/20 p-3 space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <GripVertical className="h-3.5 w-3.5" />
              {itemLabel} {index + 1}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveItem(index, -1)}
                disabled={index === 0}
                className="text-xs px-2 py-1 rounded hover:bg-muted disabled:opacity-30"
                title="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveItem(index, 1)}
                disabled={index === items.length - 1}
                className="text-xs px-2 py-1 rounded hover:bg-muted disabled:opacity-30"
                title="Move down"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="text-destructive hover:bg-destructive/10 rounded p-1"
                title="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {fields.map((f) => (
              <div
                key={f.key}
                className={f.type === "textarea" ? "sm:col-span-2" : ""}
              >
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground block mb-1">
                  {f.label}
                </label>
                {f.type === "textarea" ? (
                  <textarea
                    value={item[f.key] || ""}
                    onChange={(e) => updateItem(index, f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full rounded-md border border-border bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[70px]"
                  />
                ) : (
                  <Input
                    value={item[f.key] || ""}
                    onChange={(e) => updateItem(index, f.key, e.target.value)}
                    placeholder={f.placeholder}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addItem}
        disabled={!canAdd}
      >
        <Plus className="h-4 w-4 mr-1" />
        Add {itemLabel}
      </Button>
    </div>
  );
}
