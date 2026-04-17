import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, AlertTriangle } from "lucide-react";

interface CodePoolManagerProps {
  productId: string | null;
  deliveryType: "code" | "account";
}

interface ProductCode {
  id: string;
  code_value: string;
  credential_extra: string;
  status: string;
  assigned_at: string | null;
  created_at: string;
}

export default function CodePoolManager({ productId, deliveryType }: CodePoolManagerProps) {
  const qc = useQueryClient();
  const [bulkInput, setBulkInput] = useState("");

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ["product-codes", productId],
    queryFn: async () => {
      if (!productId) return [] as ProductCode[];
      const { data, error } = await supabase
        .from("product_codes")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProductCode[];
    },
    enabled: !!productId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!productId) throw new Error("Save the product first before adding codes.");
      const lines = bulkInput
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      if (!lines.length) throw new Error("Paste at least one code or account.");
      const rows = lines.map((line) => {
        if (deliveryType === "account") {
          // Format: email:password OR email password OR email|password
          const parts = line.split(/[:|\s]+/).filter(Boolean);
          return {
            product_id: productId,
            code_value: parts[0] || line,
            credential_extra: parts.slice(1).join(":") || "",
          };
        }
        return {
          product_id: productId,
          code_value: line,
          credential_extra: "",
        };
      });
      const { error } = await supabase.from("product_codes").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["product-codes", productId] });
      setBulkInput("");
      toast({ title: `Added ${count} ${deliveryType === "account" ? "accounts" : "codes"}` });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_codes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product-codes", productId] }),
  });

  const stats = {
    total: codes.length,
    available: codes.filter((c) => c.status === "available").length,
    assigned: codes.filter((c) => c.status === "assigned").length,
    disabled: codes.filter((c) => c.status === "disabled").length,
  };

  const lowStock = stats.available < 5;
  const inputClass = "h-10 w-full rounded-xl border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  if (!productId) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Save the product first, then come back to add {deliveryType === "account" ? "accounts" : "codes"}.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
          {deliveryType === "account" ? "Account Pool" : "Code Pool"}
        </h4>
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">
            {stats.available} available
          </span>
          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
            {stats.assigned} assigned
          </span>
        </div>
      </div>

      {lowStock && stats.total > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 px-3 py-2 text-xs">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Low stock — fewer than 5 {deliveryType === "account" ? "accounts" : "codes"} available.
        </div>
      )}

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">
          {deliveryType === "account"
            ? "Paste accounts — one per line, format: email:password (or email password)"
            : "Paste codes / license keys — one per line"}
        </label>
        <textarea
          value={bulkInput}
          onChange={(e) => setBulkInput(e.target.value)}
          className="w-full rounded-xl border border-border bg-background p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
          placeholder={
            deliveryType === "account"
              ? "user1@example.com:Pass123\nuser2@example.com:Secret456"
              : "ABCD-1234-EFGH-5678\nWXYZ-9876-MNOP-5432"
          }
        />
        <Button
          type="button"
          variant="outline-primary"
          size="sm"
          className="mt-2"
          onClick={() => addMutation.mutate()}
          disabled={addMutation.isPending || !bulkInput.trim()}
        >
          {addMutation.isPending ? (
            <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Adding…</>
          ) : (
            <><Plus className="h-3 w-3 mr-1" /> Add to pool</>
          )}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : codes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No {deliveryType === "account" ? "accounts" : "codes"} in the pool yet.
        </p>
      ) : (
        <div className="rounded-xl border border-border max-h-72 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-left font-medium px-3 py-2">Value</th>
                {deliveryType === "account" && <th className="text-left font-medium px-3 py-2">Password</th>}
                <th className="text-left font-medium px-3 py-2">Status</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-3 py-2 font-mono">{c.code_value}</td>
                  {deliveryType === "account" && (
                    <td className="px-3 py-2 font-mono text-muted-foreground">{c.credential_extra || "—"}</td>
                  )}
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-0.5 rounded-full font-medium ${
                        c.status === "available"
                          ? "bg-success/10 text-success"
                          : c.status === "assigned"
                          ? "bg-muted text-muted-foreground"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {c.status !== "assigned" && (
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(c.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
