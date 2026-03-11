import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Upload, Download, Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";
import { logActivity } from "@/lib/admin-utils";

interface ParsedProduct {
  name: string;
  tagline: string;
  description: string;
  category: string;
  tags: string[];
  price: number;
  price_label: string;
  billing_cycle: string;
  features: string[];
  external_url: string;
  image_url: string;
  in_stock: boolean;
  featured: boolean;
  published: boolean;
}

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

const DEMO_CSV = `name,tagline,description,category,tags,price,price_label,billing_cycle,features,external_url,image_url,featured,published
"Canva Pro","Design made easy","Professional design tool with thousands of templates and AI features.","Design","Design;AI;Templates",12.99,"$12.99/mo","monthly","Unlimited templates;AI image generator;Brand kit;Background remover","https://canva.com","",true,true
"Grammarly Premium","Write with confidence","AI-powered writing assistant for grammar, tone, and clarity.","Productivity","Writing;AI;Grammar",12,"$12/mo","monthly","Grammar & spelling;Tone detection;Plagiarism checker;Style suggestions","https://grammarly.com","",false,true
"DataCamp Pro","Learn data skills","Interactive courses on Python, R, SQL, and machine learning.","Education","Data Science;Python;SQL",25,"$25/mo","monthly","400+ courses;Hands-on projects;Skill assessments;Certificates","https://datacamp.com","",true,true`;

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
    } else if ((char === "\n" || (char === "\r" && text[i + 1] === "\n")) && !inQuotes) {
      if (char === "\r") i++;
      row.push(current.trim());
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }
  row.push(current.trim());
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

function mapRow(headers: string[], values: string[]): ParsedProduct | null {
  const get = (key: string) => {
    const idx = headers.indexOf(key);
    return idx >= 0 ? values[idx] ?? "" : "";
  };

  const name = get("name");
  if (!name) return null;

  return {
    name,
    tagline: get("tagline"),
    description: get("description"),
    category: get("category") || "General",
    tags: get("tags").split(";").map((t) => t.trim()).filter(Boolean),
    price: parseFloat(get("price")) || 0,
    price_label: get("price_label") || "$0",
    billing_cycle: get("billing_cycle") || "monthly",
    features: get("features").split(";").map((f) => f.trim()).filter(Boolean),
    external_url: get("external_url") || "#",
    image_url: get("image_url") || "",
    in_stock: get("in_stock") !== "" ? get("in_stock").toLowerCase() !== "false" : true,
    featured: get("featured").toLowerCase() === "true",
    published: get("published") !== "" ? get("published").toLowerCase() === "true" : true,
  };
}

interface Props {
  onClose: () => void;
  onComplete: () => void;
}

export default function BulkProductImport({ onClose, onComplete }: Props) {
  const [preview, setPreview] = useState<ParsedProduct[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadDemo = () => {
    const blob = new Blob([DEMO_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length < 2) {
        toast({ title: "Invalid CSV", description: "File must have a header row and at least one data row.", variant: "destructive" });
        return;
      }
      const headers = rows[0].map((h) => h.toLowerCase().trim());
      if (!headers.includes("name")) {
        toast({ title: "Missing 'name' column", description: "CSV must include a 'name' column.", variant: "destructive" });
        return;
      }
      const products = rows.slice(1).map((r) => mapRow(headers, r)).filter(Boolean) as ParsedProduct[];
      setPreview(products);
      setResult(null);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setImporting(true);
    const errors: string[] = [];
    let success = 0;

    for (let i = 0; i < preview.length; i++) {
      const p = preview[i];
      const { error } = await supabase.from("products").insert({
        name: p.name,
        tagline: p.tagline,
        description: p.description,
        category: p.category,
        tags: p.tags,
        price: p.price,
        price_label: p.price_label,
        billing_cycle: p.billing_cycle,
        features: p.features,
        external_url: p.external_url,
        image_url: p.image_url || null,
        in_stock: p.in_stock,
        featured: p.featured,
        published: p.published,
      });
      if (error) {
        errors.push(`Row ${i + 1} (${p.name}): ${error.message}`);
      } else {
        success++;
      }
    }

    logActivity("Bulk imported products", "product", "", `${success} of ${preview.length} products`);
    setResult({ total: preview.length, success, failed: errors.length, errors });
    setImporting(false);

    if (success > 0) {
      toast({ title: `Imported ${success} product${success > 1 ? "s" : ""}` });
      onComplete();
    }
  };

  const inputClass = "h-10 w-full rounded-[4px] border border-border bg-background px-4 text-sm";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold">Bulk Import Products</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4 mr-1" /> Close
        </Button>
      </div>

      {/* Instructions */}
      <div className="rounded-[4px] border border-border bg-muted/30 p-5 space-y-3">
        <h4 className="text-sm font-medium">CSV Format</h4>
        <p className="text-sm text-muted-foreground">
          Upload a CSV with the following columns: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">name</code> (required),{" "}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">tagline</code>,{" "}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">description</code>,{" "}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">category</code>,{" "}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">tags</code> (semicolon-separated),{" "}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">price</code>,{" "}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">price_label</code>,{" "}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">billing_cycle</code>,{" "}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">features</code> (semicolon-separated),{" "}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">external_url</code>,{" "}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">image_url</code>,{" "}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">featured</code>,{" "}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">published</code>.
        </p>
        <Button variant="outline" size="sm" onClick={downloadDemo}>
          <Download className="h-4 w-4 mr-1" /> Download Demo CSV
        </Button>
      </div>

      {/* Upload */}
      <div className="flex gap-3">
        <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
        <Button variant="outline-primary" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4 mr-1" /> Choose CSV File
        </Button>
      </div>

      {/* Preview */}
      {preview.length > 0 && !result && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium">{preview.length} product{preview.length > 1 ? "s" : ""} ready to import</h4>
          <div className="rounded-[4px] border border-border overflow-hidden max-h-[300px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left font-medium px-4 py-2">#</th>
                  <th className="text-left font-medium px-4 py-2">Name</th>
                  <th className="text-left font-medium px-4 py-2">Category</th>
                  <th className="text-left font-medium px-4 py-2">Price</th>
                  <th className="text-left font-medium px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((p, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-2 font-medium">{p.name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{p.category}</td>
                    <td className="px-4 py-2">{p.price_label}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-[4px] px-2 py-0.5 text-xs font-medium ${p.published ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        {p.published ? "Published" : "Draft"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3">
            <Button variant="gradient" onClick={handleImport} disabled={importing}>
              {importing ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Importing...</> : `Import ${preview.length} Products`}
            </Button>
            <Button variant="outline" onClick={() => setPreview([])}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {result.failed === 0 ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : (
              <AlertCircle className="h-5 w-5 text-destructive" />
            )}
            <span className="text-sm font-medium">
              {result.success} of {result.total} imported successfully
              {result.failed > 0 && `, ${result.failed} failed`}
            </span>
          </div>
          {result.errors.length > 0 && (
            <div className="rounded-[4px] border border-destructive/30 bg-destructive/5 p-4 space-y-1 max-h-[150px] overflow-y-auto">
              {result.errors.map((e, i) => (
                <p key={i} className="text-xs text-destructive">{e}</p>
              ))}
            </div>
          )}
          <Button variant="outline" onClick={() => { setPreview([]); setResult(null); }}>
            Import More
          </Button>
        </div>
      )}
    </div>
  );
}
