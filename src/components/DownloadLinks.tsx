import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Download, FileText, Film, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

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

function formatSize(bytes: number) {
  if (bytes === 0) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DownloadLinks({ orderId }: { orderId: string }) {
  const { data: tokens = [], isLoading } = useQuery({
    queryKey: ["download-tokens", orderId],
    staleTime: 0,
    gcTime: 0,
    refetchInterval: (query) => {
      // If we have no tokens yet, check every 3 seconds
      return query.state.data?.length === 0 ? 3000 : false;
    },
    queryFn: async () => {
      const { data, error } = await supabase
        .from("download_tokens")
        .select("id, token, expires_at, max_downloads, download_count, product_file_id")
        .eq("order_id", orderId);
      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Fetch file info for each token
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

  if (isLoading) return (
    <div className="mt-6 rounded-xl border border-border p-5 bg-muted/20 animate-pulse">
      <div className="h-4 w-32 bg-muted rounded mb-3"></div>
      <div className="space-y-2">
        <div className="h-12 bg-muted rounded"></div>
      </div>
    </div>
  );

  if (tokens.length === 0) return null;

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
                  <Upload className="h-4 w-4 text-green-500 rotate-180 shrink-0" />
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
                <Button size="sm" variant={isLink ? "outline-success" : "outline-primary"} onClick={() => handleAction(token)} className="shrink-0">
                  {isLink ? (
                    <><Upload className="h-3 w-3 mr-1 rotate-180" /> Open Link</>
                  ) : (
                    <><Download className="h-3 w-3 mr-1" /> Download</>
                  )}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
