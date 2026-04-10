import { useState } from "react";
import { HardDrive, Info, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

interface StorageTabProps {
  settings: Record<string, string>;
  update: (key: string, value: string) => void;
}

const FIELDS = [
  { key: "storage_base_url", label: "Base URL", placeholder: "https://storage.yourdomain.com", hint: "The root URL of your storage server" },
  { key: "storage_upload_path", label: "Upload Endpoint", placeholder: "/upload", hint: "POST endpoint for file uploads (multipart/form-data)" },
  { key: "storage_files_path", label: "Files Endpoint", placeholder: "/files", hint: "GET endpoint prefix to serve files (e.g. /files/:filename)" },
  { key: "storage_api_key", label: "API Key (optional)", placeholder: "Bearer token or API key", hint: "Authorization header value sent with requests", secret: true },
];

export function StorageTab({ settings, update }: StorageTabProps) {
  const enabled = settings["storage_enabled"] === "true";
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleTest = async () => {
    const baseUrl = (settings["storage_base_url"] || "").replace(/\/+$/, "");
    const apiKey = settings["storage_api_key"] || "";

    if (!baseUrl) {
      setTestResult({ ok: false, message: "Base URL is required" });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Try /health first (common), fall back to base URL
      const headers: Record<string, string> = {};
      if (apiKey) {
        headers["Authorization"] = apiKey;
        headers["X-API-Key"] = apiKey;
      }

      let res = await fetch(`${baseUrl}/health`, { method: "GET", headers });
      
      if (!res.ok) {
        // Fallback: try base URL
        res = await fetch(baseUrl, { method: "GET", headers });
      }

      if (res.ok) {
        const data = await res.json().catch(() => null);
        const extra = data?.status === "ok" ? " (server healthy)" : "";
        setTestResult({ ok: true, message: `Connected! Status ${res.status}${extra}` });
      } else {
        setTestResult({ ok: false, message: `Server responded with ${res.status} ${res.statusText}` });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      setTestResult({ ok: false, message: msg });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border">
        <div className="flex items-center gap-3 border-b border-border p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
            <HardDrive className="h-4 w-4 text-blue-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">External Storage Server</h3>
            <p className="text-xs text-muted-foreground">Connect your own file server for images, ebooks, videos, and digital assets</p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="storage-toggle" className="text-xs text-muted-foreground">
              {enabled ? "Enabled" : "Disabled"}
            </Label>
            <Switch
              id="storage-toggle"
              checked={enabled}
              onCheckedChange={(v) => update("storage_enabled", v ? "true" : "false")}
            />
          </div>
        </div>

        <div className="p-4 space-y-4">
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={f.key} className="text-xs font-medium">{f.label}</Label>
              <Input
                id={f.key}
                type={(f as any).secret ? "password" : "text"}
                value={settings[f.key] || ""}
                onChange={(e) => update(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="h-9 text-sm"
                disabled={!enabled}
              />
              <p className="text-[11px] text-muted-foreground">{f.hint}</p>
            </div>
          ))}

          {/* Test Connection Button */}
          <div className="pt-2 flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              disabled={!enabled || testing || !settings["storage_base_url"]}
              onClick={handleTest}
            >
              {testing ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Testing...</>
              ) : (
                "Test Connection"
              )}
            </Button>
            {testResult && (
              <span className={`flex items-center gap-1.5 text-xs font-medium ${testResult.ok ? "text-green-600" : "text-destructive"}`}>
                {testResult.ok ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                {testResult.message}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* API Reference */}
      <section className="rounded-xl border border-border">
        <div className="flex items-center gap-3 border-b border-border p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
            <Info className="h-4 w-4 text-amber-500" />
          </div>
          <h3 className="font-semibold text-sm">Expected API Format</h3>
        </div>
        <div className="p-4 space-y-4 text-xs text-muted-foreground font-mono">
          <div>
            <p className="font-semibold text-foreground mb-1 font-sans text-sm">Upload (POST)</p>
            <pre className="bg-muted rounded-lg p-3 overflow-x-auto whitespace-pre">
{`POST {base_url}{upload_path}
Content-Type: multipart/form-data
Authorization: {api_key}  (if set)

Form fields:
  file: <binary>
  folder: "products" | "blog" | "ebooks" | "videos" | "assets"

Response (JSON):
  { "url": "https://...", "filename": "abc.jpg" }`}
            </pre>
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1 font-sans text-sm">Download / Serve (GET)</p>
            <pre className="bg-muted rounded-lg p-3 overflow-x-auto whitespace-pre">
{`GET {base_url}{files_path}/{filename}

Returns the file with correct Content-Type header.
For ebooks/videos, supports Content-Disposition for downloads.`}
            </pre>
          </div>
        </div>
      </section>

      {/* File type support info */}
      <section className="rounded-xl border border-border p-4">
        <h3 className="font-semibold text-sm mb-3">Supported File Types</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Images", types: "JPG, PNG, WebP, SVG", color: "bg-green-500/10 text-green-600" },
            { label: "Ebooks", types: "PDF, EPUB", color: "bg-purple-500/10 text-purple-600" },
            { label: "Videos", types: "MP4, WebM", color: "bg-red-500/10 text-red-600" },
            { label: "Documents", types: "PDF, ZIP", color: "bg-cyan-500/10 text-cyan-600" },
          ].map((t) => (
            <div key={t.label} className="rounded-lg border border-border p-3 text-center">
              <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium mb-1 ${t.color}`}>{t.label}</span>
              <p className="text-[11px] text-muted-foreground">{t.types}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
