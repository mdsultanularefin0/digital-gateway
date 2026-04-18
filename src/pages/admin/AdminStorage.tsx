import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  listStorage, deleteStoragePath, createStorageFolder, uploadToStoragePath,
  type StorageFile,
} from "@/lib/storage";
import {
  Folder, FileIcon, Upload, FolderPlus, Trash2, ChevronRight, Home,
  RefreshCw, Loader2, Copy, ExternalLink, ImageIcon, FileText, Film, Music, Archive,
} from "lucide-react";
import { getErrorMessage } from "@/lib/admin-utils";

const BUCKETS = [
  { id: "product-images", label: "Product Images" },
  { id: "blog-images", label: "Blog Images" },
  { id: "assets", label: "Assets" },
  { id: "digital-products", label: "Digital Products" },
];

const formatSize = (bytes: number) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

const fileIcon = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"].includes(ext))
    return <ImageIcon className="h-5 w-5 text-emerald-500" />;
  if (["mp4", "webm", "mov", "mkv", "avi"].includes(ext))
    return <Film className="h-5 w-5 text-purple-500" />;
  if (["mp3", "wav", "flac", "m4a"].includes(ext))
    return <Music className="h-5 w-5 text-pink-500" />;
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext))
    return <Archive className="h-5 w-5 text-amber-500" />;
  if (["pdf", "epub", "doc", "docx", "txt", "md"].includes(ext))
    return <FileText className="h-5 w-5 text-blue-500" />;
  return <FileIcon className="h-5 w-5 text-muted-foreground" />;
};

const isImage = (name: string) =>
  ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"].includes(
    name.split(".").pop()?.toLowerCase() || ""
  );

export default function AdminStorage() {
  const queryClient = useQueryClient();
  const [bucket, setBucket] = useState(BUCKETS[0].id);
  const [prefix, setPrefix] = useState("");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ path: string; isFolder: boolean } | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [previewFile, setPreviewFile] = useState<StorageFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const queryKey = ["storage-list", bucket, prefix];

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: () => listStorage(bucket, prefix),
    retry: false,
  });

  const breadcrumbs = useMemo(() => {
    if (!prefix) return [];
    const parts = prefix.split("/").filter(Boolean);
    return parts.map((part, i) => ({
      label: part,
      path: parts.slice(0, i + 1).join("/"),
    }));
  }, [prefix]);

  const filtered = useMemo(() => {
    if (!data) return { folders: [], files: [] };
    const q = search.toLowerCase();
    return {
      folders: data.folders.filter((f) => f.toLowerCase().includes(q)),
      files: data.files.filter((f) => f.name.toLowerCase().includes(q)),
    };
  }, [data, search]);

  const switchBucket = (id: string) => {
    setBucket(id);
    setPrefix("");
    setSearch("");
  };

  const enterFolder = (folder: string) => {
    setPrefix(prefix ? `${prefix}/${folder}` : folder);
    setSearch("");
  };

  const goTo = (path: string) => {
    setPrefix(path);
    setSearch("");
  };

  const deleteMutation = useMutation({
    mutationFn: (path: string) => deleteStoragePath(bucket, path),
    onSuccess: () => {
      toast({ title: "Deleted" });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: unknown) => toast({ title: "Delete failed", description: getErrorMessage(err), variant: "destructive" }),
  });

  const folderMutation = useMutation({
    mutationFn: (name: string) => createStorageFolder(bucket, prefix ? `${prefix}/${name}` : name),
    onSuccess: () => {
      toast({ title: "Folder created" });
      setNewFolderOpen(false);
      setNewFolderName("");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: unknown) => toast({ title: "Create failed", description: getErrorMessage(err), variant: "destructive" }),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    setUploading(true);
    let success = 0;
    let failed = 0;
    for (const file of Array.from(files)) {
      try {
        await uploadToStoragePath(file, bucket, prefix);
        success++;
      } catch (err: unknown) {
        failed++;
        toast({ title: `Upload failed: ${file.name}`, description: getErrorMessage(err), variant: "destructive" });
      }
    }
    setUploading(false);
    if (e.target) e.target.value = "";
    if (success) toast({ title: `Uploaded ${success} file(s)${failed ? `, ${failed} failed` : ""}` });
    queryClient.invalidateQueries({ queryKey });
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "URL copied" });
  };

  const buildPath = (name: string) => (prefix ? `${prefix}/${name}` : name);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-display font-bold">Storage Manager</h2>
            <p className="text-sm text-muted-foreground">
              Browse, upload and manage files on your external storage server
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setNewFolderOpen(true)}>
              <FolderPlus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Folder</span>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleUpload}
            />
            <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{uploading ? "Uploading..." : "Upload"}</span>
            </Button>
          </div>
        </div>

        {/* Bucket tabs */}
        <Tabs value={bucket} onValueChange={switchBucket}>
          <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4">
            {BUCKETS.map((b) => (
              <TabsTrigger key={b.id} value={b.id} className="text-xs">
                {b.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Breadcrumbs + search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1 text-sm flex-wrap">
            <button
              onClick={() => goTo("")}
              className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="h-3.5 w-3.5" />
              {bucket}
            </button>
            {breadcrumbs.map((b) => (
              <div key={b.path} className="flex items-center">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                <button
                  onClick={() => goTo(b.path)}
                  className="px-2 py-1 rounded-md hover:bg-secondary text-foreground transition-colors"
                >
                  {b.label}
                </button>
              </div>
            ))}
          </div>
          <Input
            placeholder="Filter in this folder..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 max-w-xs"
          />
        </div>

        {/* Body */}
        <div className="rounded-xl border border-border min-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <p className="text-destructive font-medium mb-2">Failed to load storage</p>
              <p className="text-sm text-muted-foreground max-w-md">
                {(error as Error).message}
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                Check Admin → Integrations → Storage to verify the connection.
              </p>
            </div>
          ) : filtered.folders.length === 0 && filtered.files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Folder className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                {search ? "No matches" : "This folder is empty"}
              </p>
              {!search && (
                <Button variant="outline" size="sm" className="mt-4" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5" />
                  Upload Files
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {/* Folders */}
              {filtered.folders.map((folder) => (
                <div key={`f-${folder}`} className="flex items-center gap-3 p-3 hover:bg-muted/30 group">
                  <button onClick={() => enterFolder(folder)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <Folder className="h-5 w-5 text-amber-500 shrink-0" />
                    <span className="font-medium text-sm truncate">{folder}</span>
                  </button>
                  <span className="text-xs text-muted-foreground hidden sm:block">Folder</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setDeleteTarget({ path: buildPath(folder), isFolder: true })}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}

              {/* Files */}
              {filtered.files.map((file) => (
                <div key={`fl-${file.name}`} className="flex items-center gap-3 p-3 hover:bg-muted/30 group">
                  <button
                    onClick={() => isImage(file.name) ? setPreviewFile(file) : window.open(file.url, "_blank")}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    {fileIcon(file.name)}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{file.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {formatSize(file.size)}
                        {file.modified && ` · ${new Date(file.modified).toLocaleDateString()}`}
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {file.url && (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyUrl(file.url!)} title="Copy URL">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(file.url, "_blank")} title="Open">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setDeleteTarget({ path: buildPath(file.name), isFolder: false })}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer counts */}
        {data && (
          <p className="text-xs text-muted-foreground text-right">
            {data.folders.length} folder(s) · {data.files.length} file(s)
          </p>
        )}
      </div>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.isFolder ? "folder" : "file"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <span className="font-mono text-foreground">{deleteTarget?.path}</span> from{" "}
              <span className="font-mono text-foreground">{bucket}</span>.
              {deleteTarget?.isFolder && " All contents inside will be lost."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.path)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New folder */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && newFolderName.trim() && folderMutation.mutate(newFolderName.trim())}
            />
            <p className="text-xs text-muted-foreground">
              Will be created in: <span className="font-mono">{bucket}/{prefix || ""}</span>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>Cancel</Button>
            <Button
              onClick={() => folderMutation.mutate(newFolderName.trim())}
              disabled={!newFolderName.trim() || folderMutation.isPending}
            >
              {folderMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image preview */}
      <Dialog open={!!previewFile} onOpenChange={(o) => !o && setPreviewFile(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">{previewFile?.name}</DialogTitle>
          </DialogHeader>
          {previewFile?.url && (
            <div className="flex items-center justify-center bg-muted/30 rounded-lg p-4 max-h-[70vh] overflow-auto">
              <img src={previewFile.url} alt={previewFile.name} className="max-w-full h-auto rounded" />
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => previewFile?.url && copyUrl(previewFile.url)}>
              <Copy className="h-3.5 w-3.5" /> Copy URL
            </Button>
            <Button variant="outline" onClick={() => window.open(previewFile?.url, "_blank")}>
              <ExternalLink className="h-3.5 w-3.5" /> Open
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
