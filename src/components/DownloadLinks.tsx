import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Download, FileText, Film, Clock, AlertCircle, ExternalLink, Copy, Eye, EyeOff, CheckCircle2, AlertTriangle, Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface DownloadToken {
  id: string;
  token: string;
  expires_at: string | null;
  max_downloads: number;
  download_count: number;
  product_file: {
    filename: string;
    file_type: string;
    file_url: string;
    file_size: number;
  };
}

interface Delivery {
  id: string;
  delivery_type: string;
  status: string;
  payload: any;
}

function formatSize(bytes: number) {
  if (bytes === 0) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CodeReveal({ label, value }: { label: string; value: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground w-20 shrink-0">{label}:</span>
      <code className="font-mono bg-muted/60 rounded px-2 py-1 flex-1 break-all">
        {show ? value : "•".repeat(Math.min(value.length, 16))}
      </code>
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="text-muted-foreground hover:text-foreground"
        aria-label={show ? "Hide" : "Show"}
      >
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(value);
          toast({ title: "Copied to clipboard" });
        }}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Copy"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function DownloadLinks({ orderId }: { orderId: string }) {
  const { data: tokens = [], isLoading: tokensLoading } = useQuery({
    queryKey: ["download-tokens", orderId],
    staleTime: 0,
    gcTime: 0,
    refetchInterval: (query) => (query.state.data?.length === 0 ? 3000 : false),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("download_tokens")
        .select("id, token, expires_at, max_downloads, download_count, product_file_id")
        .eq("order_id", orderId);
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const fileIds = data.map((t: any) => t.product_file_id);
      const { data: files } = await supabase
        .from("product_files")
        .select("id, filename, file_type, file_url, file_size")
        .in("id", fileIds);

      const fileMap = new Map((files || []).map((f: any) => [f.id, f]));

      return data.map((t: any) => ({
        ...t,
        product_file: fileMap.get(t.product_file_id) || { filename: "Unknown", file_type: "other", file_url: "", file_size: 0 },
      })) as DownloadToken[];
    },
  });

  const { data: deliveries = [], isLoading: delivLoading } = useQuery({
    queryKey: ["order-deliveries", orderId],
    staleTime: 0,
    gcTime: 0,
    refetchInterval: (query) => {
      const list = query.state.data as Delivery[] | undefined;
      // poll while anything is pending
      return list && list.some((d) => d.status === "pending") ? 5000 : false;
    },
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_deliveries")
        .select("id, delivery_type, status, payload")
        .eq("order_id", orderId)
        .order("created_at");
      if (error) throw error;
      return (data || []) as Delivery[];
    },
  });

  const handleAction = (token: DownloadToken) => {
    const { file_url, file_type } = token.product_file;
    if (file_type === "link" || file_url.startsWith("http")) {
      window.open(file_url, "_blank");
      return;
    }
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const url = `https://${projectId}.supabase.co/functions/v1/secure-download?token=${token.token}`;
    window.open(url, "_blank");
  };

  const isLoading = tokensLoading || delivLoading;

  // Filter deliveries that aren't already represented by token-based downloads
  const nonDownloadDeliveries = deliveries.filter((d) => d.delivery_type !== "download");

  if (isLoading) return (
    <div className="mt-6 rounded-xl border border-border p-5 bg-muted/20 animate-pulse">
      <div className="h-4 w-32 bg-muted rounded mb-3"></div>
      <div className="space-y-2">
        <div className="h-12 bg-muted rounded"></div>
      </div>
    </div>
  );

  if (tokens.length === 0 && nonDownloadDeliveries.length === 0) return null;

  return (
    <div className="mt-6 rounded-xl border border-border p-5 bg-muted/20">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Download className="h-4 w-4 text-primary" />
        Order Content & Downloads
      </h3>
      <div className="space-y-2">
        {tokens.map((token) => {
          const isLink = token.product_file.file_type === "link";
          const expired = token.expires_at && new Date(token.expires_at) < new Date();
          const maxedOut = token.max_downloads > 0 && token.download_count >= token.max_downloads;
          const disabled = !isLink && (!!expired || maxedOut);

          return (
            <div key={token.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 bg-background">
              <div className="flex items-center gap-3 min-w-0">
                {isLink ? (
                  <ExternalLink className="h-4 w-4 text-green-600 shrink-0" />
                ) : token.product_file.file_type === "video" ? (
                  <Film className="h-4 w-4 text-purple-500 shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{token.product_file.filename}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {isLink ? (
                      <span className="text-green-600 font-medium">External Access</span>
                    ) : (
                      <>
                        {formatSize(token.product_file.file_size) && (
                          <span>{formatSize(token.product_file.file_size)}</span>
                        )}
                        {token.max_downloads > 0 && (
                          <span>{token.download_count}/{token.max_downloads} downloads</span>
                        )}
                      </>
                    )}
                    {token.expires_at && !isLink && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {expired ? "Expired" : `Expires ${format(new Date(token.expires_at), "PP")}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {disabled ? (
                <span className="text-xs text-destructive flex items-center gap-1 shrink-0">
                  <AlertCircle className="h-3 w-3" />
                  {expired ? "Expired" : "Limit reached"}
                </span>
              ) : (
                <Button
                  size="sm"
                  variant={isLink ? "outline" : "outline-primary"}
                  onClick={() => handleAction(token)}
                  className={isLink ? "shrink-0 text-green-600 border-green-600/40 hover:bg-green-600/10 hover:text-green-700" : "shrink-0"}
                >
                  {isLink ? (
                    <><ExternalLink className="h-3 w-3 mr-1" /> Open Link</>
                  ) : (
                    <><Download className="h-3 w-3 mr-1" /> Download</>
                  )}
                </Button>
              )}
            </div>
          );
        })}

        {nonDownloadDeliveries.map((d) => {
          const productName = d.payload?.product_name || "Item";
          const code = d.payload?.code as string | undefined;
          const extra = d.payload?.credential_extra as string | undefined;
          const isAccount = d.delivery_type === "account";

          return (
            <div key={d.id} className="rounded-lg border border-border p-3 bg-background space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate">{productName}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 shrink-0 ${
                    d.status === "delivered"
                      ? "bg-green-500/10 text-green-700 dark:text-green-400"
                      : d.status === "failed"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-500"
                  }`}
                >
                  {d.status === "delivered" ? <CheckCircle2 className="h-3 w-3" /> :
                   d.status === "failed" ? <AlertTriangle className="h-3 w-3" /> :
                   <Hourglass className="h-3 w-3" />}
                  {d.status === "pending" ? "Awaiting fulfillment" : d.status}
                </span>
              </div>
              {d.status === "delivered" && code && (
                <div className="rounded bg-muted/40 p-2 space-y-1.5">
                  <CodeReveal label={isAccount ? "Username" : "Code"} value={code} />
                  {extra && <CodeReveal label="Password" value={extra} />}
                </div>
              )}
              {d.status === "pending" && (
                <p className="text-xs text-muted-foreground">
                  We're processing this — you'll receive an email as soon as it's ready.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
