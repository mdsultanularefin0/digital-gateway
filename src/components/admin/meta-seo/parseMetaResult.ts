import type { MetaSeoValues } from "../MetaSeoFields";

export function parseMetaResult(result: string): Partial<MetaSeoValues> {
  const out: Partial<MetaSeoValues> = {};
  const t = result.match(/TITLE:\s*(.+)/i);
  if (t?.[1]) out.meta_title = t[1].trim();
  const d = result.match(/DESCRIPTION:\s*(.+)/i);
  if (d?.[1]) out.meta_description = d[1].trim();
  const k = result.match(/KEYWORDS:\s*(.+)/i);
  if (k?.[1]) out.meta_keywords = k[1].trim();
  return out;
}
