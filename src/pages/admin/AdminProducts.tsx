import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Upload, Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];
type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];

interface Tier {
  id?: string;
  label: string;
  price: number;
  badge: string;
  sort_order: number;
}

const emptyProduct: ProductInsert = {
  name: "",
  tagline: "",
  description: "",
  category: "General",
  tags: [],
  price: 0,
  price_label: "$0",
  billing_cycle: "monthly",
  features: [],
  external_url: "#",
  featured: false,
  published: true,
};

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Product | ProductInsert | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [featuresInput, setFeaturesInput] = useState("");
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [images, setImages] = useState<{ id?: string; image_url: string; alt_text: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  const editingId = editing && "id" in editing ? (editing as Product).id : null;

  // Load tiers when editing an existing product
  useEffect(() => {
    if (!editingId) return;
    supabase
      .from("product_tiers")
      .select("*")
      .eq("product_id", editingId)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data) {
          setTiers(data.map((t) => ({ id: t.id, label: t.label, price: Number(t.price), badge: t.badge || "", sort_order: t.sort_order })));
        }
      });
    // Load images
    supabase
      .from("product_images")
      .select("*")
      .eq("product_id", editingId)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data) setImages(data.map((img) => ({ id: img.id, image_url: img.image_url, alt_text: img.alt_text })));
      });
  }, [editingId]);

  const saveMutation = useMutation({
    mutationFn: async (product: ProductInsert & { id?: string }) => {
      const payload = {
        ...product,
        tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
        features: featuresInput.split("\n").map((f) => f.trim()).filter(Boolean),
      };

      let productId = product.id;

      if (product.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", product.id);
        if (error) throw error;
      } else {
        const { id: _, ...insertPayload } = payload;
        const { data, error } = await supabase.from("products").insert(insertPayload).select("id").single();
        if (error) throw error;
        productId = data.id;
      }

      // Save tiers: delete existing, then insert current
      if (productId) {
        await supabase.from("product_tiers").delete().eq("product_id", productId);
        if (tiers.length > 0) {
          const tierRows = tiers.map((t, i) => ({
            product_id: productId!,
            label: t.label,
            price: t.price,
            badge: t.badge || null,
            sort_order: i,
          }));
          const { error } = await supabase.from("product_tiers").insert(tierRows);
          if (error) throw error;
        }

        // Save images: delete existing, then insert current
        if (productId) {
          await supabase.from("product_images").delete().eq("product_id", productId);
          if (images.length > 0) {
            const imgRows = images.map((img, i) => ({
              product_id: productId!,
              image_url: img.image_url,
              alt_text: img.alt_text,
              sort_order: i,
            }));
            const { error } = await supabase.from("product_images").insert(imgRows);
            if (error) throw error;
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setEditing(null);
      setTiers([]);
      setImages([]);
      toast({ title: "Product saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast({ title: "Product deleted" });
    },
  });

  const openEditor = (product?: Product) => {
    if (product) {
      setEditing(product);
      setIsNew(false);
      setTagsInput((product.tags || []).join(", "));
      setFeaturesInput((product.features || []).join("\n"));
    } else {
      setEditing({ ...emptyProduct });
      setIsNew(true);
      setTagsInput("");
      setFeaturesInput("");
      setTiers([]);
      setImages([]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    saveMutation.mutate(editing as ProductInsert & { id?: string });
  };

  const addTier = () => {
    setTiers([...tiers, { label: "", price: 0, badge: "", sort_order: tiers.length }]);
  };

  const updateTier = (index: number, field: keyof Tier, value: string | number) => {
    setTiers(tiers.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };

  const removeTier = (index: number) => {
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("product-images").upload(path, file);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
        setImages((prev) => [...prev, { image_url: urlData.publicUrl, alt_text: file.name.replace(/\.[^.]+$/, '') }]);
      }
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const inputClass = "h-10 w-full rounded-[4px] border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  if (editing) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-bold">{isNew ? "New Product" : "Edit Product"}</h2>
          <Button variant="ghost" size="sm" onClick={() => { setEditing(null); setTiers([]); }}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
        </div>

        <form onSubmit={handleSave} className="max-w-2xl space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Name *</label>
              <input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <input value={editing.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Tagline</label>
            <input value={editing.tagline ?? ""} onChange={(e) => setEditing({ ...editing, tagline: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Description</label>
            <textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="w-full rounded-[4px] border border-border bg-background p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Base Price</label>
              <input type="number" step="0.01" value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: parseFloat(e.target.value) })} className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Price Label</label>
              <input value={editing.price_label ?? ""} onChange={(e) => setEditing({ ...editing, price_label: e.target.value })} className={inputClass} placeholder="e.g. $29/mo" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Billing Cycle</label>
              <input value={editing.billing_cycle ?? ""} onChange={(e) => setEditing({ ...editing, billing_cycle: e.target.value })} className={inputClass} />
            </div>
          </div>

          {/* Subscription Tiers */}
          <div className="rounded-[4px] border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-medium tracking-executive uppercase text-muted-foreground">Subscription Tiers</h4>
              <Button type="button" variant="outline-primary" size="sm" onClick={addTier}>
                <Plus className="h-3 w-3 mr-1" /> Add Tier
              </Button>
            </div>

            {tiers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No tiers added. The base price will be shown on the product page.</p>
            ) : (
              <div className="space-y-3">
                {tiers.map((tier, i) => (
                  <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto] gap-3 items-end rounded-[4px] border border-border bg-muted/20 p-3">
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1 block">Label *</label>
                      <input
                        required
                        value={tier.label}
                        onChange={(e) => updateTier(i, "label", e.target.value)}
                        className={inputClass}
                        placeholder="e.g. 1 Month"
                      />
                    </div>
                    <div className="w-28">
                      <label className="text-[11px] text-muted-foreground mb-1 block">Price *</label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        value={tier.price}
                        onChange={(e) => updateTier(i, "price", parseFloat(e.target.value) || 0)}
                        className={inputClass}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1 block">Badge</label>
                      <input
                        value={tier.badge}
                        onChange={(e) => updateTier(i, "badge", e.target.value)}
                        className={inputClass}
                        placeholder="e.g. Best Value"
                      />
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeTier(i)} className="mb-0.5">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">External URL *</label>
            <input required value={editing.external_url ?? ""} onChange={(e) => setEditing({ ...editing, external_url: e.target.value })} className={inputClass} placeholder="https://..." />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Tags (comma separated)</label>
            <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} className={inputClass} placeholder="Design, AI, Productivity" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Features (one per line)</label>
            <textarea value={featuresInput} onChange={(e) => setFeaturesInput(e.target.value)} className="w-full rounded-[4px] border border-border bg-background p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[120px]" placeholder="Feature 1&#10;Feature 2" />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.featured ?? false} onChange={(e) => setEditing({ ...editing, featured: e.target.checked })} className="rounded" />
              Featured
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.published ?? true} onChange={(e) => setEditing({ ...editing, published: e.target.checked })} className="rounded" />
              Published
            </label>
          </div>
          <Button variant="gradient" size="lg" type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save Product"}
          </Button>
        </form>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-display font-bold">Products</h2>
        <Button variant="gradient" size="sm" onClick={() => openEditor()}>
          <Plus className="h-4 w-4 mr-1" /> Add Product
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : !products?.length ? (
        <div className="rounded-[4px] border border-dashed border-border p-12 text-center text-muted-foreground">
          No products yet. Click "Add Product" to create one.
        </div>
      ) : (
        <div className="rounded-[4px] border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left font-medium px-4 py-3">Name</th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Category</th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Price</th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Status</th>
                <th className="text-right font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{p.category}</td>
                  <td className="px-4 py-3 hidden md:table-cell">{p.price_label}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`rounded-[4px] px-2 py-0.5 text-xs font-medium ${p.published ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {p.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditor(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this product?")) deleteMutation.mutate(p.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
