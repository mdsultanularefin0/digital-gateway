/**
 * Convert an image File to WebP using a canvas.
 * Falls back to the original file if conversion fails or the file is already
 * an efficient format (gif/svg/webp/avif) or larger than 12MB (skip resize/encode).
 */
export async function convertToWebP(
  file: File,
  options: { quality?: number; maxDimension?: number } = {}
): Promise<File> {
  const { quality = 0.82, maxDimension = 2400 } = options;

  if (typeof window === "undefined") return file;
  if (!file.type.startsWith("image/")) return file;

  // Skip formats we don't want to (or can't safely) re-encode
  const skip = ["image/webp", "image/avif", "image/gif", "image/svg+xml"];
  if (skip.includes(file.type)) return file;

  // Hard cap to keep main thread responsive
  if (file.size > 12 * 1024 * 1024) return file;

  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;

    if (Math.max(width, height) > maxDimension) {
      const scale = maxDimension / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality)
    );
    if (!blob) return file;

    // If the conversion didn't actually shrink the file, keep the original
    if (blob.size >= file.size * 0.95) return file;

    const newName = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], newName, { type: "image/webp", lastModified: Date.now() });
  } catch {
    return file;
  }
}
