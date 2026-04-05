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

  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

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
    throw new Error(`Storage upload failed (${res.status}): ${text}`);
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
