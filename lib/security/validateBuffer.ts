import { fileTypeFromBuffer } from "file-type";

import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "./route"; // adjust path if needed

type ValidateResult =
  | { ok: true; detectedMime: string; detectedExt: string }
  | { ok: false; reason: string };

export async function validateBufferMagicBytes(
  buffer: Buffer
): Promise<ValidateResult> {
  if (!buffer || buffer.length === 0)
    return { ok: false, reason: "Empty file" };
  if (buffer.length > MAX_FILE_SIZE)
    return { ok: false, reason: "File exceeds 50MB limit" };

  const detected = await fileTypeFromBuffer(buffer);

  // HTML fallback (file-type often returns undefined for text/html)
  if (!detected) {
    const head = buffer.subarray(0, 4096).toString("utf8").toLowerCase();
    const looksLikeHtml =
      head.includes("<!doctype html") ||
      head.includes("<html") ||
      head.includes("<head") ||
      head.includes("<body");

    if (looksLikeHtml && ALLOWED_MIME_TYPES.includes("text/html")) {
      return { ok: true, detectedMime: "text/html", detectedExt: "html" };
    }

    return { ok: false, reason: "Unknown or unsupported file type" };
  }

  if (!ALLOWED_MIME_TYPES.includes(detected.mime)) {
    return { ok: false, reason: `Invalid file type: ${detected.mime}` };
  }

  return { ok: true, detectedMime: detected.mime, detectedExt: detected.ext };
}
