import { supabase } from "@/integrations/supabase/client";

interface StorageConfig {
  enabled: boolean;
  baseUrl: string;
  uploadPath: string;
  filesPath: string;
  apiKey: string;
}

let cachedConfig: StorageConfig | null = null;

export async function getStorageConfig(): Promise<StorageConfig> {
  if (cachedConfig) return cachedConfig;

  const keys = ["storage_enabled", "storage_base_url", "storage_upload_path", "storage_files_path", "storage_api_key"];
  const { data } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", keys);

  const map: Record<string, string> = {};
  (data || []).forEach((r) => (map[r.key] = r.value));

  cachedConfig = {
    enabled: map.storage_enabled === "true",
    baseUrl: (map.storage_base_url || "").replace(/\/+$/, ""),
    uploadPath: map.storage_upload_path || "/upload",
    filesPath: map.storage_files_path || "/files",
    apiKey: map.storage_api_key || "",
  };

  return cachedConfig;
}

export function clearStorageConfigCache() {
  cachedConfig = null;
}

export interface UploadResult {
  url: string;
  filename: string;
}

/**
 * Upload a file to the external storage server.
 * @param file - File to upload
 * @param folder - Logical folder: "products", "blog", "ebooks", "videos", "assets"
 */
export async function uploadToStorage(file: File, folder: string = "assets"): Promise<UploadResult> {
  const config = await getStorageConfig();

  if (!config.enabled || !config.baseUrl) {
    throw new Error("External storage is not configured. Go to Admin → Integrations → Storage to set it up.");
  }

  // Map logical folder names → server bucket names
  const bucketMap: Record<string, string> = {
    "products": "product-images",
    "blog": "blog-images",
    "assets": "assets",
    "digital-products": "digital-products",
  };
  const bucket = bucketMap[folder] ?? folder;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("bucket", bucket); // server reads req.body.bucket

  const headers: Record<string, string> = {};
  if (config.apiKey) {
    headers["X-API-Key"] = config.apiKey;
    headers["Authorization"] = config.apiKey;
  }

  const res = await fetch(`${config.baseUrl}${config.uploadPath}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    // Strip HTML tags to get readable error text
    const clean = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
    throw new Error(`Storage upload failed (${res.status}): ${clean}`);
  }

  const result = await res.json();
  return {
    url: result.url || `${config.baseUrl}${config.filesPath}/${result.filename}`,
    filename: result.filename || file.name,
  };
}

/**
 * Build a full file URL from a filename.
 */
export async function getFileUrl(filename: string): Promise<string> {
  const config = await getStorageConfig();
  if (!config.enabled || !config.baseUrl) return filename;
  return `${config.baseUrl}${config.filesPath}/${filename}`;
}

// ---------- Browse / Manage ----------

export interface StorageFile {
  name: string;
  size: number;
  modified?: string;
  url?: string;
}

export interface StorageListResult {
  folders: string[];
  files: StorageFile[];
}

function authHeaders(config: StorageConfig): Record<string, string> {
  const h: Record<string, string> = {};
  if (config.apiKey) {
    h["X-API-Key"] = config.apiKey;
    h["Authorization"] = config.apiKey;
  }
  return h;
}

export async function listStorage(bucket: string, prefix = ""): Promise<StorageListResult> {
  const config = await getStorageConfig();
  if (!config.enabled || !config.baseUrl) throw new Error("Storage not configured");
  const url = new URL(`${config.baseUrl}/list`);
  url.searchParams.set("bucket", bucket);
  if (prefix) url.searchParams.set("prefix", prefix);
  const res = await fetch(url.toString(), { headers: authHeaders(config) });
  if (!res.ok) throw new Error(`List failed (${res.status}): ${await res.text().catch(() => "")}`.slice(0, 300));
  const data = await res.json();
  const files: StorageFile[] = (data.files || []).map((f: any) => ({
    name: f.name,
    size: f.size ?? 0,
    modified: f.modified,
    url: f.url || `${config.baseUrl}${config.filesPath}/${prefix ? prefix + "/" : ""}${f.name}`,
  }));
  return { folders: data.folders || [], files };
}

export async function deleteStoragePath(bucket: string, path: string): Promise<void> {
  const config = await getStorageConfig();
  if (!config.enabled || !config.baseUrl) throw new Error("Storage not configured");
  const res = await fetch(`${config.baseUrl}/delete`, {
    method: "DELETE",
    headers: { ...authHeaders(config), "Content-Type": "application/json" },
    body: JSON.stringify({ bucket, path }),
  });
  if (!res.ok) throw new Error(`Delete failed (${res.status})`);
}

export async function createStorageFolder(bucket: string, path: string): Promise<void> {
  const config = await getStorageConfig();
  if (!config.enabled || !config.baseUrl) throw new Error("Storage not configured");
  const res = await fetch(`${config.baseUrl}/mkdir`, {
    method: "POST",
    headers: { ...authHeaders(config), "Content-Type": "application/json" },
    body: JSON.stringify({ bucket, path }),
  });
  if (!res.ok) throw new Error(`Create folder failed (${res.status})`);
}

export async function uploadToStoragePath(file: File, bucket: string, path: string): Promise<UploadResult> {
  const config = await getStorageConfig();
  if (!config.enabled || !config.baseUrl) throw new Error("Storage not configured");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("bucket", bucket);
  if (path) formData.append("path", path);
  const res = await fetch(`${config.baseUrl}${config.uploadPath}`, {
    method: "POST",
    headers: authHeaders(config),
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upload failed (${res.status}): ${text.replace(/<[^>]+>/g, " ").slice(0, 200)}`);
  }
  const result = await res.json();
  return {
    url: result.url || `${config.baseUrl}${config.filesPath}/${path ? path + "/" : ""}${result.filename || file.name}`,
    filename: result.filename || file.name,
  };
}
