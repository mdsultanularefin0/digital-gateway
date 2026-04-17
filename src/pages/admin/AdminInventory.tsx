import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { AlertTriangle, Package } from "lucide-react";
import { Link } from "react-router-dom";

interface InventoryRow {
  product_id: string;
  product_name: string;
  delivery_type: string;
  available: number;
  assigned: number;
  disabled: number;
}

const LOW_STOCK_THRESHOLD = 5;

export default function AdminInventory() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-inventory"],
    queryFn: async (): Promise<InventoryRow[]> => {
      // Fetch only products that need a code/account pool
      const { data: products, error: pErr } = await supabase
        .from("products")
        .select("id, name, delivery_type")
        .in("delivery_type", ["code", "account"])
        .order("name");
      if (pErr) throw pErr;
      if (!products?.length) return [];

      const ids = products.map((p) => p.id);
      const { data: codes, error: cErr } = await supabase
        .from("product_codes")
        .select("product_id, status")
        .in("product_id", ids);
      if (cErr) throw cErr;

      return products.map((p) => {
        const pCodes = (codes || []).filter((c: any) => c.product_id === p.id);
        return {
          product_id: p.id,
          product_name: p.name,
          delivery_type: p.delivery_type,
          available: pCodes.filter((c: any) => c.status === "available").length,
          assigned: pCodes.filter((c: any) => c.status === "assigned").length,
          disabled: pCodes.filter((c: any) => c.status === "disabled").length,
        };
      });
    },
  });

  const lowStockCount = rows.filter((r) => r.available < LOW_STOCK_THRESHOLD).length;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-display font-bold">Inventory</h2>
          <p className="text-sm text-muted-foreground">Code & account pool levels per product.</p>
        </div>
        {lowStockCount > 0 && (
          <span className="text-xs px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 font-medium flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            {lowStockCount} product{lowStockCount === 1 ? "" : "s"} low on stock
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
          No products with code or account delivery yet. Set delivery type on a product to start managing inventory.
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left font-medium px-4 py-3">Product</th>
                <th className="text-left font-medium px-4 py-3">Type</th>
                <th className="text-left font-medium px-4 py-3">Available</th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Assigned</th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Disabled</th>
                <th className="text-right font-medium px-4 py-3">Manage</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const low = r.available < LOW_STOCK_THRESHOLD;
                return (
                  <tr key={r.product_id} className={`border-t border-border ${low ? "bg-yellow-500/5" : ""}`}>
                    <td className="px-4 py-3 font-medium">{r.product_name}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{r.delivery_type}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        low ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-500" : "bg-success/10 text-success"
                      }`}>
                        {r.available}{low && " · low"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{r.assigned}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{r.disabled}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to="/admin/products" className="text-primary text-xs hover:underline">
                        Open product →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
