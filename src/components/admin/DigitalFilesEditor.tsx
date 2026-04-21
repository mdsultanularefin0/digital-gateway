import { useState } from "react";
import { uploadToStorage } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Upload, Loader2, Trash2, FileText, Film } from "lucide-react";

export interface DigitalFile {
  id?: string;
  file_url: string;
  filename: string;
  file_type: string;
  file_size: number;
}

const FILE_TYPE_OPTIONS = [
  { value: "ebook", label: "eBook (PDF/EPUB)" },
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
  { value: "software", label: "Software" },
  { value: "other", label: "Other" },
];

const fileTypeIcon = (type: string) => {
  switch (type) {
    case "video": return <Film className="h-4 w-4 text-purple-500" />;
    default: return <FileText className="h-4 w-4 text-blue-500" />;
  }
};

const formatSize = (bytes: number) => {
  if (bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface Props {
  files: DigitalFile[];
  onChange: (files: DigitalFile[]) => void;
}

export default function DigitalFilesEditor({ files, onChange }: Props) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        const result = await uploadToStorage(file, "digital-products");
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        let fileType = "other";
        if (["pdf", "epub", "mobi"].includes(ext)) fileType = "ebook";
        else if (["mp4", "webm", "mkv", "avi"].includes(ext)) fileType = "video";
        else if (["mp3", "wav", "flac", "m4a"].includes(ext)) fileType = "audio";
        else if (["zip", "rar", "exe", "dmg"].includes(ext)) fileType = "software";

        onChange([...files, {
          file_url: result.url,
          filename: file.name,
          file_type: fileType,
          file_size: file.size,
        }]);
      }
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  const updateFile = (index: number, field: keyof DigitalFile, value: string) => {
    onChange(files.map((f, i) => i === index ? { ...f, [field]: value } : f));
  };

  const inputClass = "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm";

  return (
    <div className="rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-medium tracking-executive uppercase text-muted-foreground">Digital Files & Links</h4>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const name = prompt("Enter Link Name (e.g. Google Drive Folder)");
              const url = prompt("Enter External URL (e.g. https://drive.google.com/...)");
              if (name && url) {
                onChange([...files, {
                  filename: name,
                  file_url: url,
                  file_type: "link",
                  file_size: 0
                }]);
              }
            }}
          >
            <Upload className="h-3 w-3 mr-1 rotate-180" /> Add Link
          </Button>
          <label className="cursor-pointer">
            <input type="file" multiple onChange={handleUpload} className="hidden" />
            <Button type="button" variant="outline-primary" size="sm" asChild disabled={uploading}>
              <span>{uploading ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Uploading...</> : <><Upload className="h-3 w-3 mr-1" /> Upload File</>}</span>
            </Button>
          </label>
        </div>
      </div>

      {files.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No digital content. Upload files or add external links (Drive, Mega, etc.)
        </p>
      ) : (
        <div className="space-y-3">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3 bg-muted/30">
              {file.file_type === "link" ? (
                <Upload className="h-4 w-4 text-green-500 rotate-180 shrink-0" />
              ) : (
                fileTypeIcon(file.file_type)
              )}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{file.filename}</span>
                  {file.file_type !== "link" && (
                    <span className="text-xs text-muted-foreground">{formatSize(file.file_size)}</span>
                  )}
                  {file.file_type === "link" && (
                    <span className="text-[10px] bg-green-500/10 text-green-600 px-1 rounded uppercase font-bold">Link</span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={file.filename}
                      onChange={(e) => updateFile(i, "filename", e.target.value)}
                      className={inputClass}
                      placeholder="Display name"
                    />
                    <select
                      value={file.file_type}
                      onChange={(e) => updateFile(i, "file_type", e.target.value)}
                      className={inputClass}
                    >
                      {FILE_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                      <option value="link">External Link (Drive/Mega)</option>
                    </select>
                  </div>
                  <input
                    value={file.file_url}
                    onChange={(e) => updateFile(i, "file_url", e.target.value)}
                    className={inputClass}
                    placeholder="File or Link URL"
                  />
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeFile(i)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
