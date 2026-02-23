export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/html",
  "application/zip",
  "application/x-zip-compressed",
  "video/mp4",
  "video/webm",
];

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .slice(0, 100);
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: `Invalid file type: ${file.type}` };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "File exceeds 50MB limit" };
  }
  return { valid: true };
}
