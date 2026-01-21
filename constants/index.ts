/**
 * Format file size in bytes to human-readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

/**
 * Get file type from filename
 */
export const getFileType = (fileName: string): "image" | "html" | "other" => {
  const lowerName = fileName.toLowerCase();
  if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(lowerName)) {
    return "image";
  }
  if (/\.(html|htm)$/i.test(lowerName)) {
    return "html";
  }
  return "other";
};
