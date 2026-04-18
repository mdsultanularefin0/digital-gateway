import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Parse a CSV row respecting quoted fields. Lightweight; not full RFC4180.
 */
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const splitLine = (line: string) => {
    const out: string[] = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === "," && !inQ) {
        out.push(cur); cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const headers = splitLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = splitLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = (cells[i] || "").trim()));
    return row;
  });
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 90);
}

interface Props {
  onClose: () => void;
}

export function BulkBlogImport({ onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const rows = parseCSV(text);
    setPreview(rows);
  };

  const importRows = async () => {
    if (!preview.length) return;
    setImporting(true);
    try {
      const payload = preview.map((r) => ({
        title: r.title || "Untitled",
        slug: r.slug || slugify(r.title || "post"),
        excerpt: r.excerpt || "",
        content: r.content || "",
        category: r.category || "General",
        author: r.author || "Team",
        published: (r.published || "false").toLowerCase() === "true",
        published_at: (r.published || "").toLowerCase() === "true" ? new Date().toISOString() : null,
        meta_title: r.meta_title || r.title || "",
        meta_description: r.meta_description || r.excerpt || "",
        meta_keywords: r.meta_keywords || "",
      }));
      const { error } = await supabase.from("blog_posts").insert(payload);
      if (error) throw error;
      toast({ title: `Imported ${payload.length} posts` });
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      onClose();
    } catch (e: any) {
      toast({ title: "Import failed", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border p-5 space-y-4 bg-muted/20">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4" /> Bulk import blog posts (CSV)
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Required columns: <code>title</code>. Optional: <code>slug, excerpt, content, category, author, published, meta_title, meta_description, meta_keywords</code>.
      </p>
      <div className="flex gap-2 flex-wrap">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="h-3.5 w-3.5 mr-1" /> Choose CSV
        </Button>
        {preview.length > 0 && (
          <Button variant="gradient" size="sm" disabled={importing} onClick={importRows}>
            {importing && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
            Import {preview.length} posts
          </Button>
        )}
      </div>
      {preview.length > 0 && (
        <div className="rounded-lg border border-border max-h-60 overflow-auto text-xs">
          <table className="w-full">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-left p-2">Title</th>
                <th className="text-left p-2">Slug</th>
                <th className="text-left p-2">Published</th>
              </tr>
            </thead>
            <tbody>
              {preview.slice(0, 50).map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="p-2 truncate max-w-[180px]">{r.title}</td>
                  <td className="p-2 font-mono">{r.slug || slugify(r.title || "")}</td>
                  <td className="p-2">{r.published || "false"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {preview.length > 50 && <p className="p-2 text-muted-foreground">…and {preview.length - 50} more</p>}
        </div>
      )}
    </div>
  );
}
