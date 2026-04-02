import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Upload, Loader2, Download, CheckSquare, Square, FileUp } from "lucide-react";
import { exportToCSV, logActivity } from "@/lib/admin-utils";
import type { Database } from "@/integrations/supabase/types";
import BulkProductImport from "@/components/admin/BulkProductImport";

type Product = Database["public"]["Tables"]["products"]["Row"];
type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];

interface Tier {
  id?: string;
  label: string;
  price: number;
  badge: string;
  sort_order: number;
  is_default: boolean;
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
  in_stock: true,
  slug: "",
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkImport, setShowBulkImport] = useState(false);

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
          setTiers(data.map((t) => ({ id: t.id, label: t.label, price: Number(t.price), badge: t.badge || "", sort_order: t.sort_order, is_default: (t as any).is_default ?? false })));
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
            is_default: t.is_default,
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
      const productName = editing?.name || "";
      logActivity(isNew ? "Created product" : "Updated product", "product", editingId || "", productName);
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
      logActivity("Deleted product", "product", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast({ title: "Product deleted" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("products").delete().in("id", ids);
      if (error) throw error;
      logActivity("Bulk deleted products", "product", "", `${ids.length} products`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setSelectedIds(new Set());
      toast({ title: `Deleted ${selectedIds.size} products` });
    },
  });

  const bulkPublishMutation = useMutation({
    mutationFn: async ({ ids, published }: { ids: string[]; published: boolean }) => {
      const { error } = await supabase.from("products").update({ published }).in("id", ids);
      if (error) throw error;
      logActivity(published ? "Bulk published products" : "Bulk unpublished products", "product", "", `${ids.length} products`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setSelectedIds(new Set());
      toast({ title: "Products updated" });
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
    setTiers([...tiers, { label: "", price: 0, badge: "", sort_order: tiers.length, is_default: tiers.length === 0 }]);
  };

  const setDefaultTier = (index: number) => {
    setTiers(tiers.map((t, i) => ({ ...t, is_default: i === index })));
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
        const result = await uploadToStorage(file, "products");
        setImages((prev) => [...prev, { image_url: result.url, alt_text: file.name.replace(/\.[^.]+$/, '') }]);
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

  const inputClass = "h-10 w-full rounded-xl border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  if (showBulkImport) {
    return (
      <AdminLayout>
        <BulkProductImport
          onClose={() => setShowBulkImport(false)}
          onComplete={() => queryClient.invalidateQueries({ queryKey: ["admin-products"] })}
        />
      </AdminLayout>
    );
  }

  if (editing) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-bold">{isNew ? "New Product" : "Edit Product"}</h2>
          <Button variant="ghost" size="sm" onClick={() => { setEditing(null); setTiers([]); setImages([]); }}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
        </div>

        <form onSubmit={handleSave} className="max-w-2xl space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Name *</label>
              <input required value={editing.name} onChange={(e) => {
                const newName = e.target.value;
                const updates: any = { ...editing, name: newName };
                // Auto-generate slug from name if slug is empty or was auto-generated
                if (isNew || !(editing as any).slug) {
                  updates.slug = newName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
                }
                setEditing(updates);
              }} className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Slug *</label>
              <input required value={(editing as any).slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') } as any)} className={inputClass} placeholder="product-url-slug" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
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
            <textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="w-full rounded-xl border border-border bg-background p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]" />
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
          <div className="rounded-xl border border-border p-5">
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
                  <div key={i} className={`grid grid-cols-[auto_1fr_auto_1fr_auto] gap-3 items-end rounded-xl border p-3 ${tier.is_default ? "border-primary bg-primary/5" : "border-border bg-muted/20"}`}>
                    <div className="flex flex-col items-center gap-1 pb-1">
                      <label className="text-[11px] text-muted-foreground mb-1 block">Default</label>
                      <button
                        type="button"
                        onClick={() => setDefaultTier(i)}
                        className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${tier.is_default ? "border-primary bg-primary" : "border-muted-foreground hover:border-primary"}`}
                      >
                        {tier.is_default && <span className="h-2 w-2 rounded-full bg-primary-foreground" />}
                      </button>
                    </div>
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

          {/* Product Images */}
          <div className="rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-medium tracking-executive uppercase text-muted-foreground">Product Images</h4>
              <label className="cursor-pointer">
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                <Button type="button" variant="outline-primary" size="sm" asChild disabled={uploading}>
                  <span>{uploading ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Uploading...</> : <><Upload className="h-3 w-3 mr-1" /> Upload</>}</span>
                </Button>
              </label>
            </div>
            {images.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No images uploaded. A placeholder will be shown.</p>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {images.map((img, i) => (
                  <div key={i} className="relative group rounded-xl overflow-hidden border border-border">
                    <img src={img.image_url} alt={img.alt_text} className="w-full aspect-square object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 h-6 w-6 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
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
            <textarea value={featuresInput} onChange={(e) => setFeaturesInput(e.target.value)} className="w-full rounded-xl border border-border bg-background p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[120px]" placeholder="Feature 1&#10;Feature 2" />
          </div>
          <div className="flex gap-4 flex-wrap">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.featured ?? false} onChange={(e) => setEditing({ ...editing, featured: e.target.checked })} className="rounded" />
              Featured
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.published ?? true} onChange={(e) => setEditing({ ...editing, published: e.target.checked })} className="rounded" />
              Published
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={(editing as any).in_stock !== false} onChange={(e) => setEditing({ ...editing, in_stock: e.target.checked } as any)} className="rounded" />
              In Stock
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowBulkImport(true)}>
            <FileUp className="h-4 w-4 mr-1" /> Bulk Import
          </Button>
          <Button variant="outline" size="sm" onClick={async () => {
            if (!products?.length) return;
            const productIds = products.map((p) => p.id);
            const [{ data: allTiers }, { data: allImages }] = await Promise.all([
              supabase.from("product_tiers").select("*").in("product_id", productIds).order("sort_order"),
              supabase.from("product_images").select("*").in("product_id", productIds).order("sort_order"),
            ]);
            exportToCSV(
              products.map((p) => {
                const pTiers = (allTiers || []).filter((t) => t.product_id === p.id);
                const pImages = (allImages || []).filter((img) => img.product_id === p.id);
                return {
                  name: p.name,
                  tagline: p.tagline,
                  description: p.description,
                  category: p.category,
                  tags: (p.tags || []).join("; "),
                  price: p.price,
                  price_label: p.price_label,
                  billing_cycle: p.billing_cycle,
                  features: (p.features || []).join("; "),
                  external_url: p.external_url,
                  image_url: p.image_url || "",
                  in_stock: p.in_stock,
                  featured: p.featured,
                  published: p.published,
                  tiers: pTiers.map((t) => `${t.label}:${t.price}:${t.badge || ""}`).join("; "),
                  gallery_images: pImages.map((img) => `${img.image_url}|${img.alt_text || ""}`).join("; "),
                };
              }),
              `products-${new Date().toISOString().slice(0, 10)}`
            );
          }}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
          <Button variant="gradient" size="sm" onClick={() => openEditor()}>
            <Plus className="h-4 w-4 mr-1" /> Add Product
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-xl border border-primary/20 bg-primary/5">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => bulkPublishMutation.mutate({ ids: Array.from(selectedIds), published: true })}>
            Publish
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkPublishMutation.mutate({ ids: Array.from(selectedIds), published: false })}>
            Unpublish
          </Button>
          <Button size="sm" variant="destructive" onClick={() => {
            if (confirm(`Delete ${selectedIds.size} products?`)) bulkDeleteMutation.mutate(Array.from(selectedIds));
          }}>
            Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
        </div>
      )}

      {isLoading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : !products?.length ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          No products yet. Click "Add Product" to create one.
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="w-10 px-3 py-3">
                  <button onClick={() => {
                    if (selectedIds.size === products.length) setSelectedIds(new Set());
                    else setSelectedIds(new Set(products.map((p) => p.id)));
                  }} className="text-muted-foreground hover:text-foreground">
                    {selectedIds.size === products.length ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                  </button>
                </th>
                <th className="text-left font-medium px-4 py-3">Name</th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Category</th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Price</th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Stock</th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Status</th>
                <th className="text-right font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className={`border-t border-border transition-colors ${selectedIds.has(p.id) ? "bg-primary/5" : "hover:bg-muted/30"}`}>
                  <td className="px-3 py-3">
                    <button onClick={() => toggleSelect(p.id)} className="text-muted-foreground hover:text-foreground">
                      {selectedIds.has(p.id) ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{p.category}</td>
                  <td className="px-4 py-3 hidden md:table-cell">{p.price_label}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`rounded-xl px-2 py-0.5 text-xs font-medium ${(p as any).in_stock !== false ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                      {(p as any).in_stock !== false ? "In Stock" : "Out of Stock"}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`rounded-xl px-2 py-0.5 text-xs font-medium ${p.published ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
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
