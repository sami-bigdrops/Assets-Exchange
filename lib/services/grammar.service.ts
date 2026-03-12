import dns from "dns";
import http from "http";
import type { LookupFunction } from "net";
import { parse } from "url";

import { eq } from "drizzle-orm";
import sharp from "sharp";

import { db } from "@/lib/db";
import { saveBuffer } from "@/lib/fileStorage";
import { externalTasks } from "@/lib/schema";

const AI_BASE_URL = process.env.GRAMMAR_AI_URL;
const AI_TIMEOUT_MS = 600000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 15000;
const MAX_IMAGE_SIZE_BYTES =
  typeof process.env.GRAMMAR_MAX_IMAGE_BYTES !== "undefined"
    ? Math.max(
        256 * 1024,
        parseInt(process.env.GRAMMAR_MAX_IMAGE_BYTES, 10) || 1024 * 1024
      )
    : 1024 * 1024;
const MAX_IMAGE_DIMENSION =
  typeof process.env.GRAMMAR_MAX_IMAGE_DIMENSION !== "undefined"
    ? Math.min(
        4096,
        Math.max(
          640,
          parseInt(process.env.GRAMMAR_MAX_IMAGE_DIMENSION, 10) || 1920
        )
      )
    : 1920;

function lookupIPv4(
  hostname: string,
  options: dns.LookupAllOptions | dns.LookupOneOptions,
  callback: (
    err: NodeJS.ErrnoException | null,
    address: string | dns.LookupAddress[],
    family: number
  ) => void
): void {
  const opts = Object.assign({}, options, { family: 4 });
  dns.lookup(hostname, opts, callback);
}

function grammarHealthGet(baseUrl: string, timeoutMs = 8000): Promise<boolean> {
  const url = `${baseUrl.replace(/\/$/, "")}/health`;
  const parsed = parse(url);
  const path = (parsed.pathname || "/") + (parsed.search || "");
  const port = parsed.port ? parseInt(parsed.port) : 80;
  return new Promise((resolve) => {
    const req = http.get(
      {
        hostname: parsed.hostname ?? undefined,
        port,
        path,
        agent: false,
        lookup: lookupIPv4 as LookupFunction,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => (data += chunk.toString()));
        res.on("end", () => resolve(res.statusCode === 200));
      }
    );
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
    req.on("error", () => resolve(false));
  });
}

async function resizeImageIfNeeded(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
  const isImage =
    mimeType.startsWith("image/") &&
    (mimeType.includes("jpeg") ||
      mimeType.includes("jpg") ||
      mimeType.includes("png") ||
      mimeType.includes("webp"));
  if (!isImage || buffer.length <= MAX_IMAGE_SIZE_BYTES) {
    return { buffer, mimeType, filename };
  }
  try {
    const out = await sharp(buffer)
      .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer();
    const newName = filename.replace(/\.[^.]+$/i, ".jpg");
    console.warn(
      `Resized image for grammar API: ${(buffer.length / 1024).toFixed(0)}KB -> ${(out.length / 1024).toFixed(0)}KB`
    );
    return { buffer: out, mimeType: "image/jpeg", filename: newName };
  } catch (err) {
    console.warn("Image resize failed, sending original:", err);
    return { buffer, mimeType, filename };
  }
}
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.Open_AI;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

async function nativeHttpPost(
  url: string,
  fileBuffer: Buffer,
  filename: string,
  mimeType: string,
  extraFields: Record<string, string> = {},
  timeoutMs = 300000
): Promise<{ status: number; body: string }> {
  const boundary = `----NodeFormBoundary${Date.now().toString(16)}`;

  const buildPart = (name: string, value: string): Buffer =>
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
    );

  const escapedFilename = filename.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const fileFieldName = process.env.GRAMMAR_AI_FILE_FIELD ?? "file";
  const filePart = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${fileFieldName}"; filename="${escapedFilename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
    ),
    fileBuffer,
    Buffer.from("\r\n"),
  ]);

  const fieldParts = Object.entries(extraFields).map(([k, v]) =>
    buildPart(k, v)
  );
  const closingBoundary = Buffer.from(`--${boundary}--\r\n`);

  const body = Buffer.concat([filePart, ...fieldParts, closingBoundary]);

  const parsed = parse(url);
  const path = (parsed.pathname || "/") + (parsed.search || "");
  const port = parsed.port ? parseInt(parsed.port) : 80;
  const hostHeader =
    parsed.hostname && parsed.port
      ? `${parsed.hostname}:${parsed.port}`
      : (parsed.hostname ?? "");

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: parsed.hostname ?? undefined,
        port,
        path,
        method: "POST",
        agent: false,
        lookup: lookupIPv4 as LookupFunction,
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": body.length,
          ...(hostHeader && { Host: hostHeader }),
          "User-Agent": "GrammarBot/1.0 (Assets-Exchange)",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => (data += chunk.toString()));
        res.on("end", () =>
          resolve({ status: res.statusCode ?? 0, body: data })
        );
      }
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

interface ExtractedImage {
  url: string;
  blob: Blob;
  filename: string;
}

async function extractImagesFromHtml(
  htmlContent: string
): Promise<ExtractedImage[]> {
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const matches = [...htmlContent.matchAll(imgRegex)];
  const images: ExtractedImage[] = [];

  if (matches.length === 0) {
    console.warn("No images found in HTML");
    return images;
  }

  console.warn(
    `Found ${matches.length} images in HTML, extracting for separate processing...`
  );

  for (let i = 0; i < matches.length; i++) {
    const imgUrl = matches[i][1];

    if (imgUrl.startsWith("data:")) {
      console.warn(`Skipping base64 image (model doesn't support base64)`);
      continue;
    }
    if (!imgUrl.startsWith("http://") && !imgUrl.startsWith("https://")) {
      console.warn(`Skipping non-HTTP URL: ${imgUrl.substring(0, 50)}`);
      continue;
    }

    try {
      console.warn(
        `Downloading image ${i + 1}/${matches.length}: ${imgUrl.substring(0, 80)}...`
      );
      const imgResponse = await fetch(imgUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; GrammarBot/1.0)",
        },
      });

      if (!imgResponse.ok) {
        console.warn(
          `Failed to download image (${imgResponse.status}): ${imgUrl.substring(0, 50)}`
        );
        continue;
      }

      const contentType =
        imgResponse.headers.get("content-type") || "image/png";
      const arrayBuffer = await imgResponse.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: contentType });

      let filename = `image-${i + 1}`;
      try {
        const urlPath = new URL(imgUrl).pathname;
        const urlFilename = urlPath.split("/").pop();
        if (urlFilename && urlFilename.includes(".")) {
          filename = urlFilename;
        } else {
          const ext = contentType.split("/").pop() || "png";
          filename = `${filename}.${ext}`;
        }
      } catch {
        const ext = contentType.split("/").pop() || "png";
        filename = `${filename}.${ext}`;
      }

      images.push({ url: imgUrl, blob, filename });
      console.warn(
        `Extracted image: ${filename} (${(blob.size / 1024).toFixed(1)}KB)`
      );
    } catch (err) {
      console.warn(`Error downloading image ${imgUrl.substring(0, 50)}:`, err);
    }
  }

  return images;
}

async function callOpenAI(
  content:
    | string
    | Array<{ type: string; text?: string; image_url?: { url: string } }>
): Promise<Record<string, unknown>> {
  if (typeof content !== "string") {
    console.warn(
      "[OpenAI] callOpenAI: only string (text) content is used in this codebase; images are never sent to OpenAI."
    );
  }
  console.warn(
    "[OpenAI] callOpenAI function invoked, API key present:",
    !!OPENAI_API_KEY
  );
  if (!OPENAI_API_KEY) return {};

  try {
    const messages = Array.isArray(content)
      ? [{ role: "user", content }]
      : [{ role: "user", content }];

    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API Error: ${response.status}`);
    }

    const data = await response.json();
    const messageContent = data.choices?.[0]?.message?.content;
    return messageContent ? JSON.parse(messageContent) : {};
  } catch (err) {
    console.error("OpenAI API failed:", err);
    return {};
  }
}

async function processImageWithAI(
  blob: Blob,
  filename: string
): Promise<Record<string, unknown> | null> {
  if (!AI_BASE_URL) return null;

  const timeouts = [300000, 300000, 300000];

  for (let attempt = 0; attempt < timeouts.length; attempt++) {
    const timeout = timeouts[attempt];

    try {
      console.warn(
        `Processing image: ${filename} (attempt ${attempt + 1}/${timeouts.length}, timeout ${timeout / 1000}s)...`
      );

      const fileBuffer = Buffer.from(await blob.arrayBuffer());
      const mt = blob.type || "image/jpeg";
      const {
        buffer: sendBuffer,
        mimeType: sendMimeType,
        filename: sendFilename,
      } = await resizeImageIfNeeded(fileBuffer, mt, filename);
      const base = AI_BASE_URL?.replace(/\/$/, "") ?? "";
      const path = process.env.GRAMMAR_AI_PROCESS_PATH || "/process";
      const processUrl = `${base}${path.startsWith("/") ? path : `/${path}`}${path.includes("?") ? "&" : "?"}format=json`;
      let res = await nativeHttpPost(
        processUrl,
        sendBuffer,
        sendFilename,
        sendMimeType,
        { async_processing: "true" },
        timeout
      );
      if (res.status === 404 && !path.includes("v1")) {
        res = await nativeHttpPost(
          `${base}/v1/process?format=json`,
          sendBuffer,
          sendFilename,
          sendMimeType,
          { async_processing: "true" },
          timeout
        );
      }

      if (res.status < 200 || res.status >= 300) {
        console.warn(`AI response error for ${filename}: ${res.status}`);
        if (attempt < timeouts.length - 1) {
          const retryDelay =
            res.status === 503 || res.status === 502 || res.status === 504
              ? 5000 * (attempt + 1)
              : 0;
          if (retryDelay > 0) {
            console.warn(
              `Service unavailable (${res.status}), waiting ${retryDelay / 1000}s before retry...`
            );
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          }
          console.warn(`Retrying ${filename}...`);
          continue;
        }
        return null;
      }

      const data = JSON.parse(res.body) as Record<string, unknown>;
      const resultData = (data.result || data) as Record<string, unknown>;
      const allKeys = Object.keys(resultData);
      console.warn(
        `AI response for ${filename}: status=${data.status}, keys=${allKeys.join(", ")}`
      );

      for (const key of allKeys) {
        const val = resultData[key];
        if (
          typeof val === "string" &&
          (val.startsWith("data:image/") ||
            val.includes("blob") ||
            key.includes("image"))
        ) {
          console.warn(
            `  -> Found potential image in '${key}': ${val.substring(0, 80)}...`
          );
        }
      }

      return data;
    } catch (err) {
      const isTimeout =
        err instanceof Error && err.message?.includes("timed out");
      console.warn(
        `${isTimeout ? "Timeout" : "Error"} processing ${filename} (attempt ${attempt + 1}):`,
        err
      );

      if (attempt < timeouts.length - 1) {
        console.warn(`Retrying ${filename} with longer timeout...`);
        continue;
      }
      return null;
    }
  }

  return null;
}

interface CorrectionItem {
  [key: string]: unknown;
  original?: string;
  incorrect?: string;
  wrong?: string;
  error?: string;
  error_text?: string;
  original_text?: string;
  text?: string;
  before?: string;
  correction?: string;
  corrected?: string;
  correct?: string;
  replacement?: string;
  suggested?: string;
  suggestion?: string;
  corrected_text?: string;
  after?: string;
  fix?: string;
}

function grammarScoreFromErrorCount(errorCount: number): number {
  if (errorCount <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round(100 - errorCount * 6)));
}

function sanitizeBase64ForDB(value: unknown): unknown {
  if (typeof value === "string" && value.startsWith("data:image/")) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeBase64ForDB);
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = sanitizeBase64ForDB(v);
    }
    return result;
  }
  return value;
}

function applyCorrectionsToHtml(html: string, corrections: unknown[]): string {
  if (!corrections || corrections.length === 0) return html;

  let highlightedHtml = html;

  for (const item of corrections) {
    if (!item || typeof item !== "object") continue;

    const correction = item as CorrectionItem;

    let originalText =
      correction.original ||
      correction.incorrect ||
      correction.wrong ||
      correction.error ||
      correction.error_text ||
      correction.original_text ||
      correction.text ||
      correction.before;

    let correctedText =
      correction.correction ||
      correction.corrected ||
      correction.correct ||
      correction.replacement ||
      correction.suggested ||
      correction.suggestion ||
      correction.corrected_text ||
      correction.after ||
      correction.fix;

    if (!originalText || !correctedText) {
      const keys = Object.keys(correction);
      for (const key of keys) {
        const val = correction[key];
        if (typeof val !== "string") continue;

        const lowerKey = key.toLowerCase();
        if (
          !originalText &&
          (lowerKey.includes("original") ||
            lowerKey.includes("error") ||
            lowerKey.includes("wrong") ||
            lowerKey.includes("incorrect") ||
            lowerKey.includes("before"))
        ) {
          originalText = val;
        }
        if (
          !correctedText &&
          (lowerKey.includes("correct") ||
            lowerKey.includes("fix") ||
            lowerKey.includes("suggest") ||
            lowerKey.includes("replace") ||
            lowerKey.includes("after"))
        ) {
          correctedText = val;
        }
      }
    }

    if (originalText && correctedText && originalText !== correctedText) {
      const escapedOriginal = originalText.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );
      const regex = new RegExp(
        `(?<=>)([^<]*)(${escapedOriginal})([^<]*)(?=<)`,
        "gi"
      );

      const beforeHighlight = highlightedHtml;
      const escapedCorrected = correctedText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

      highlightedHtml = highlightedHtml.replace(
        regex,
        (match, before, found, after) => {
          return `${before}<mark class="grammar-highlight" data-correction="${escapedCorrected}" title="Suggested: ${escapedCorrected}">${found}</mark>${after}`;
        }
      );

      if (highlightedHtml === beforeHighlight) {
        const escapedCorrectedSimple = correctedText
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
        highlightedHtml = highlightedHtml.replace(
          originalText,
          `<mark class="grammar-highlight" data-correction="${escapedCorrectedSimple}" title="Suggested: ${escapedCorrectedSimple}">${originalText}</mark>`
        );
      }
    }
  }

  return highlightedHtml;
}

type GrammarFeedbackItem = {
  category?: string;
  message: string;
  severity?: "info" | "warning" | "error";
  originalText?: string;
  suggestedText?: string;
  location?: {
    line?: number;
    column?: number;
    offset?: number;
  };
};

function extractGrammarFeedback(
  resultData: Record<string, unknown>
): GrammarFeedbackItem[] {
  try {
    const feedback: GrammarFeedbackItem[] = [];

    if (!resultData || typeof resultData !== "object") {
      console.warn(
        "[GrammarFeedback] Invalid resultData: not an object",
        typeof resultData
      );
      return feedback;
    }

    const corrections = Array.isArray(resultData.corrections)
      ? resultData.corrections
      : [];
    const issues = Array.isArray(resultData.issues) ? resultData.issues : [];

    if (!Array.isArray(resultData.corrections) && resultData.corrections) {
      console.warn(
        "[GrammarFeedback] Unexpected corrections format:",
        typeof resultData.corrections,
        "Expected array, got",
        Object.keys(resultData.corrections || {}).slice(0, 5)
      );
    }

    if (!Array.isArray(resultData.issues) && resultData.issues) {
      console.warn(
        "[GrammarFeedback] Unexpected issues format:",
        typeof resultData.issues,
        "Expected array, got",
        Object.keys(resultData.issues || {}).slice(0, 5)
      );
    }

    const processItem = (
      item: unknown,
      source: "correction" | "issue"
    ): GrammarFeedbackItem | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const correction = item as CorrectionItem & {
        category?: string;
        type?: string;
        severity?: string;
        message?: string;
        line?: number;
        column?: number;
        offset?: number;
      };

      const originalText =
        correction.original ||
        correction.incorrect ||
        correction.wrong ||
        correction.error ||
        correction.error_text ||
        correction.original_text ||
        correction.text ||
        correction.before;

      const suggestedText =
        correction.correction ||
        correction.corrected ||
        correction.correct ||
        correction.replacement ||
        correction.suggested ||
        correction.suggestion ||
        correction.corrected_text ||
        correction.after ||
        correction.fix;

      if (!originalText && !suggestedText && !correction.message) {
        return null;
      }

      let message = correction.message;
      if (!message) {
        if (originalText && suggestedText) {
          message = `"${originalText}" should be "${suggestedText}"`;
        } else if (originalText) {
          message = `Issue found: "${originalText}"`;
        } else if (suggestedText) {
          message = `Suggestion: "${suggestedText}"`;
        } else {
          message = "Grammar issue detected";
        }
      }

      let category = correction.category || correction.type;
      if (!category) {
        if (source === "correction") {
          category = "grammar_correction";
        } else {
          category = "grammar_issue";
        }
      }

      let severity: "info" | "warning" | "error" = "warning";
      if (correction.severity) {
        const sev = String(correction.severity).toLowerCase();
        if (sev === "error" || sev === "critical") {
          severity = "error";
        } else if (sev === "info" || sev === "information") {
          severity = "info";
        } else {
          severity = "warning";
        }
      } else {
        severity = source === "correction" ? "warning" : "info";
      }

      const location: GrammarFeedbackItem["location"] = {};
      if (typeof correction.line === "number") {
        location.line = correction.line;
      }
      if (typeof correction.column === "number") {
        location.column = correction.column;
      }
      if (typeof correction.offset === "number") {
        location.offset = correction.offset;
      }

      return {
        category,
        message,
        severity,
        originalText: originalText || undefined,
        suggestedText: suggestedText || undefined,
        location: Object.keys(location).length > 0 ? location : undefined,
      };
    };

    for (const item of corrections) {
      const feedbackItem = processItem(item, "correction");
      if (feedbackItem) {
        feedback.push(feedbackItem);
      }
    }

    for (const item of issues) {
      const feedbackItem = processItem(item, "issue");
      if (feedbackItem) {
        feedback.push(feedbackItem);
      }
    }

    if (feedback.length > 0) {
      console.warn(
        `[GrammarFeedback] Extracted ${feedback.length} grammar issue(s)`
      );
    } else if (corrections.length === 0 && issues.length === 0) {
      console.warn(
        "[GrammarFeedback] No corrections or issues found in response"
      );
    }

    return feedback;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error(
      "[GrammarFeedback] Error extracting grammar feedback:",
      errorMessage,
      {
        resultDataKeys: resultData
          ? Object.keys(resultData).slice(0, 10)
          : "null",
        errorStack: errorStack?.substring(0, 200),
      }
    );

    return [];
  }
}

function extractGrammarFeedbackWithBusinessLogic(
  resultData: Record<string, unknown> | null | undefined,
  taskStatus: string
): GrammarFeedbackItem[] | null {
  if (taskStatus !== "completed") {
    return null;
  }

  if (!resultData || typeof resultData !== "object") {
    return null;
  }

  try {
    const feedback = extractGrammarFeedback(resultData);
    return feedback;
  } catch (error) {
    console.error(
      "[GrammarFeedback] Failed to extract feedback (parsing failed, returning null):",
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

export const GrammarService = {
  async warmupService(): Promise<{ success: boolean; message: string }> {
    if (!AI_BASE_URL) {
      return { success: false, message: "GRAMMAR_AI_URL not configured" };
    }

    try {
      let lastError: Error | null = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          const response = await fetch(`${AI_BASE_URL}/health`, {
            method: "GET",
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            return { success: true, message: "Service is warm and ready" };
          }
          lastError = new Error(`Health check returned ${response.status}`);
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          if (attempt < 3) {
            const waitTime = 10000;
            console.warn(
              `Health check failed, waiting ${waitTime / 1000}s before retry (attempt ${attempt}/3)...`
            );
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            continue;
          }
        }
      }
      return {
        success: false,
        message: lastError?.message || "Warmup failed after retries",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, message: `Warmup failed: ${message}` };
    }
  },

  async submitForAnalysis(
    creativeId: string,
    fileUrl: string,
    userId?: string,
    htmlContent?: string
  ) {
    try {
      if (!AI_BASE_URL) {
        console.warn("GRAMMAR_AI_URL not configured, returning mock response");
        const [task] = await db
          .insert(externalTasks)
          .values({
            creativeId,
            userId,
            source: "grammar_ai_mock",
            externalTaskId: `mock-${Date.now()}`,
            status: "completed",
            result: {
              status: "SUCCESS",
              message: "Mock analysis - AI service not configured",
              result: {
                input_type: "image",
                corrections_count: 0,
                issues: [],
                suggestions: [
                  {
                    icon: "info",
                    type: "info",
                    description:
                      "Grammar AI service is not configured. Set GRAMMAR_AI_URL in environment variables.",
                  },
                ],
                qualityScore: {
                  grammar: 100,
                  readability: 100,
                  conversion: 100,
                  brandAlignment: 100,
                },
              },
            },
            startedAt: new Date(),
            finishedAt: new Date(),
          })
          .returning();
        return {
          success: true,
          taskId: task.externalTaskId,
          dbTaskId: task.id,
        };
      }

      const grammarBaseUrl = AI_BASE_URL?.replace(/\/$/, "") ?? "";
      const healthOk = await grammarHealthGet(grammarBaseUrl, 8000);
      if (!healthOk) {
        throw new Error(
          `Grammar API unreachable. Check ${grammarBaseUrl}/health and GRAMMAR_AI_URL.`
        );
      }

      console.warn(
        `Starting Grammar Analysis for: ${fileUrl.substring(0, 100)}...`
      );

      let blob: Blob;
      let filename: string;
      if (htmlContent) {
        console.warn("Using provided HTML content for analysis");
        blob = new Blob([htmlContent], { type: "text/html" });
        filename = "creative.html";
      } else if (fileUrl.startsWith("data:")) {
        const matches = fileUrl.match(/^data:([^;]+);base64,(.*)$/);
        if (!matches) {
          throw new Error("Invalid data URL format");
        }
        const mimeType = matches[1];
        const base64Data = matches[2];

        const buffer = Buffer.from(base64Data, "base64");
        blob = new Blob([buffer], { type: mimeType });

        const ext = mimeType.split("/").pop() || "png";
        filename = `creative.${ext}`;
        console.warn(
          `Data URL detected, filename: ${filename}, MIME type: ${mimeType}`
        );
      } else {
        console.warn(`Fetching file from: ${fileUrl}`);
        const fileRes = await fetch(fileUrl);
        if (!fileRes.ok) {
          throw new Error(
            `Failed to download file from storage: ${fileRes.status}`
          );
        }
        blob = await fileRes.blob();

        const urlObj = new URL(fileUrl);
        const pathParts = urlObj.pathname.split("/");
        const rawFilename = pathParts[pathParts.length - 1] || "file";
        filename = rawFilename;
        const lastHyphenIdx = rawFilename.lastIndexOf("-");
        if (lastHyphenIdx > 0) {
          filename = rawFilename.substring(lastHyphenIdx + 1);
        }

        if (!filename.includes(".")) {
          const ext = blob.type.split("/").pop() || "png";
          filename = `${filename}.${ext}`;
        }
        console.warn(
          `File fetched: ${filename}, size: ${(blob.size / 1024 / 1024).toFixed(2)} MB, type: ${blob.type}`
        );
      }

      const isHtml =
        filename.endsWith(".html") ||
        filename.endsWith(".htm") ||
        blob.type === "text/html";
      const extractedImageResults: Array<Record<string, unknown>> = [];
      let modifiedHtmlContent: string | null = null;
      let originalHtmlText: string | null = null;

      const urlReplacements: Map<string, string> = new Map();

      if (isHtml) {
        console.warn(
          "HTML file detected, extracting images for separate processing..."
        );
        try {
          let htmlText = await blob.text();
          originalHtmlText = htmlText;
          const extractedImages = await extractImagesFromHtml(htmlText);

          if (extractedImages.length > 0) {
            for (const img of extractedImages) {
              const imgResult = await processImageWithAI(
                img.blob,
                img.filename
              );
              if (imgResult) {
                extractedImageResults.push(imgResult);

                const resultData = (imgResult.result || imgResult) as Record<
                  string,
                  unknown
                >;
                let markedUrl: string | null = null;

                const imgResultKeys = Object.keys(resultData);

                if (typeof resultData.marked_image === "string") {
                  markedUrl = resultData.marked_image;
                } else if (typeof resultData.annotated_image === "string") {
                  markedUrl = resultData.annotated_image;
                } else if (typeof resultData.output_image === "string") {
                  markedUrl = resultData.output_image;
                } else if (typeof resultData.processed_image === "string") {
                  markedUrl = resultData.processed_image;
                } else {
                  for (const key of imgResultKeys) {
                    const val = resultData[key];
                    if (
                      typeof val === "string" &&
                      (val.startsWith("data:image/") ||
                        (val.startsWith("https://") &&
                          (val.includes(".png") || val.includes(".jpg"))))
                    ) {
                      markedUrl = val;
                      console.warn(
                        `Found image in field '${key}' for ${img.filename}`
                      );
                      break;
                    }
                  }
                }

                if (markedUrl && markedUrl.startsWith("data:image/")) {
                  try {
                    const matches = markedUrl.match(
                      /^data:(image\/([a-z]+));base64,(.+)$/
                    );
                    if (matches) {
                      const ext = matches[2];
                      const base64Data = matches[3];
                      const buffer = Buffer.from(base64Data, "base64");
                      const savedFilename = `marked-${Date.now()}-${img.filename.replace(/\.[^.]+$/, "")}.${ext}`;
                      const uploaded = await saveBuffer(
                        buffer,
                        savedFilename,
                        "proofread-results"
                      );
                      markedUrl = uploaded.url;
                      console.warn(
                        `Converted marked image to URL: ${markedUrl}`
                      );
                    }
                  } catch (saveErr) {
                    console.warn("Failed to save marked image:", saveErr);
                  }
                }

                if (markedUrl) {
                  urlReplacements.set(img.url, markedUrl);
                  console.warn(
                    `Will replace: ${img.url.substring(0, 50)}... -> ${markedUrl.substring(0, 50)}...`
                  );
                }
              }
            }

            if (urlReplacements.size > 0) {
              for (const [originalUrl, markedUrl] of urlReplacements) {
                htmlText = htmlText.split(originalUrl).join(markedUrl);
              }
              modifiedHtmlContent = htmlText;
            }
          } else {
            modifiedHtmlContent = originalHtmlText;
          }
          const textOnlyHtml = originalHtmlText.replace(
            /<img[^>]*>/gi,
            "<!-- image placeholder -->"
          );
          blob = new Blob([textOnlyHtml], { type: "text/html" });
        } catch (extractErr) {
          console.warn(
            "Failed to extract/process images from HTML:",
            extractErr
          );
        }
      }

      let lastError: Error | null = null;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const attemptHealthOk = await grammarHealthGet(grammarBaseUrl, 5000);
          if (!attemptHealthOk) {
            console.warn(
              `Grammar API health failed before attempt ${attempt}, trying /process anyway...`
            );
          }

          const startTime = Date.now();
          const fileBuffer = Buffer.from(await blob.arrayBuffer());
          const mimeType = blob.type || "application/octet-stream";
          const {
            buffer: sendBuffer,
            mimeType: sendMimeType,
            filename: sendFilename,
          } = await resizeImageIfNeeded(fileBuffer, mimeType, filename);

          const processPath = process.env.GRAMMAR_AI_PROCESS_PATH || "/process";
          const processUrl = `${grammarBaseUrl}${processPath.startsWith("/") ? processPath : `/${processPath}`}${processPath.includes("?") ? "&" : "?"}format=json`;

          console.warn(
            `Sending file to AI service (attempt ${attempt}/${MAX_RETRIES}): ${processUrl} [field: ${process.env.GRAMMAR_AI_FILE_FIELD ?? "file"}]`
          );

          let res: { status: number; body: string };
          try {
            res = await nativeHttpPost(
              processUrl,
              sendBuffer,
              sendFilename,
              sendMimeType,
              { async_processing: "true" },
              AI_TIMEOUT_MS
            );
            if (res.status === 404 && !processPath.includes("v1")) {
              console.warn("404 on /process, retrying with /v1/process...");
              res = await nativeHttpPost(
                `${grammarBaseUrl}/v1/process?format=json`,
                sendBuffer,
                sendFilename,
                sendMimeType,
                { async_processing: "true" },
                AI_TIMEOUT_MS
              );
            }
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.warn(
              `Request completed in ${duration}s with status ${res.status}`
            );
          } catch (fetchErr) {
            const fetchError = fetchErr as Error & {
              cause?: { code?: string };
            };
            const causeMsg =
              fetchError.cause && fetchError.cause instanceof Error
                ? fetchError.cause.message
                : String(fetchError.cause ?? "");
            console.error(
              `Request error after attempt ${attempt}:`,
              fetchError.name,
              fetchError.message,
              causeMsg ? `(cause: ${causeMsg})` : ""
            );
            const isTimeout =
              fetchError.name === "AbortError" ||
              fetchError.message?.includes("timed out");
            const isRetryableNetwork =
              fetchError.message?.includes("socket hang up") ||
              fetchError.message?.includes("fetch failed") ||
              fetchError.message?.includes("ECONNRESET") ||
              fetchError.message?.includes("ECONNREFUSED") ||
              (causeMsg &&
                /ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND/i.test(causeMsg));

            if (isTimeout || isRetryableNetwork) {
              lastError = fetchError;
              const delay = RETRY_DELAY_MS * attempt;
              if (attempt < MAX_RETRIES) {
                console.warn(
                  `Retrying in ${delay / 1000}s (attempt ${attempt}/${MAX_RETRIES})...`
                );
                await new Promise((resolve) => setTimeout(resolve, delay));
                continue;
              }
              const base = isTimeout
                ? `AI Service request timed out after ${AI_TIMEOUT_MS / 1000} seconds.`
                : `Network error: ${fetchError.message}`;
              throw new Error(
                `${base} Verify the grammar API is reachable (e.g. open ${AI_BASE_URL?.replace(/\/$/, "")}/health in a browser).`
              );
            }
            throw new Error(`Network error: ${fetchError.message}`);
          }

          console.warn(`AI Response: status=${res.status}`);

          if (res.status === 502 || res.status === 503 || res.status === 504) {
            const delay = RETRY_DELAY_MS * attempt;
            console.warn(
              `AI Service temporarily unavailable (${res.status}), attempt ${attempt}/${MAX_RETRIES}. Waiting ${delay / 1000}s...`
            );
            if (attempt < MAX_RETRIES) {
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }
            throw new Error(
              `AI Service temporarily unavailable (${res.status}). The service may be starting up - please try again in a few moments.`
            );
          }

          if (res.status < 200 || res.status >= 300) {
            console.error(`AI Service Error Response Body: "${res.body}"`);
            const pathHint =
              res.status === 404
                ? " Check the API docs (e.g. GRAMMAR_AI_URL/docs) for the correct path and set GRAMMAR_AI_PROCESS_PATH if needed."
                : "";
            throw new Error(
              `AI Service Error (${res.status}): ${res.body || "Empty response"}${pathHint}`
            );
          }

          let data: {
            task_id: string;
            status?: string;
            corrections?: unknown[];
            issues?: unknown[];
            corrected_html?: string;
            result?: Record<string, unknown>;
            marked_image?: string;
          };

          try {
            data = JSON.parse(res.body) as typeof data;
            const raw = data as unknown as Record<string, unknown>;
            console.warn(`AI Response data:`, {
              task_id: data.task_id,
              status: data.status,
              hasResult: !!data.result,
              resultKeys: data.result ? Object.keys(data.result) : [],
              topLevelKeys: Object.keys(raw),
              hasMarkedImage:
                !!(data.result as Record<string, unknown>)?.marked_image ||
                !!data.marked_image,
              messagePreview:
                typeof raw.message === "string"
                  ? raw.message.substring(0, 300)
                  : undefined,
            });
          } catch (_jsonError) {
            console.error(
              `Failed to parse AI response as JSON:`,
              res.body.substring(0, 500)
            );
            throw new Error(
              `AI Service returned invalid JSON: ${res.body.substring(0, 200)}`
            );
          }

          const raw = data as unknown as Record<string, unknown>;

          // Map new compliance API format → legacy grammar service format
          if (!data.corrections && !data.issues && !data.result) {
            if (Array.isArray(raw.violations)) {
              data.issues = raw.violations as unknown[];
            }
            if (
              typeof raw.status === "string" &&
              (raw.status === "pass" || raw.status === "fail")
            ) {
              data.status = raw.status === "fail" ? "SUCCESS" : raw.status;
            }
            // message field is a base64 image
            if (
              typeof raw.message === "string" &&
              raw.message.startsWith("data:image/")
            ) {
              data.marked_image = raw.message;
              if (!data.issues) data.issues = [];
            }
            // message field is a plain URL to an image
            if (
              typeof raw.message === "string" &&
              (raw.message.startsWith("http://") ||
                raw.message.startsWith("https://")) &&
              /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(raw.message)
            ) {
              data.marked_image = raw.message;
              if (!data.issues) data.issues = [];
            }
          }

          const isSync =
            data.task_id === "universal" ||
            data.status === "SUCCESS" ||
            data.corrections ||
            data.issues ||
            data.corrected_html ||
            data.result ||
            data.marked_image ||
            raw.status === "pass" ||
            raw.status === "fail";

          if (isSync) {
            let resultData = (data.result || data) as Record<string, unknown>;

            if (data.marked_image && typeof data.marked_image === "string") {
              resultData = { ...resultData, marked_image: data.marked_image };
            }
            if (isHtml && (modifiedHtmlContent || originalHtmlText)) {
              const allCorrections: unknown[] = [];
              const allIssues: unknown[] = [];
              const imageMarkedUrls: string[] = [];

              if (extractedImageResults.length > 0) {
                for (const imgResult of extractedImageResults) {
                  const imgData = (imgResult.result || imgResult) as Record<
                    string,
                    unknown
                  >;

                  if (Array.isArray(imgData.corrections)) {
                    allCorrections.push(...imgData.corrections);
                  }
                  if (Array.isArray(imgData.issues)) {
                    allIssues.push(...imgData.issues);
                  }

                  if (typeof imgData.marked_image === "string") {
                    imageMarkedUrls.push(imgData.marked_image);
                  }
                }
              }

              const htmlCorrections = Array.isArray(resultData.corrections)
                ? resultData.corrections
                : [];
              const htmlIssues = Array.isArray(resultData.issues)
                ? resultData.issues
                : [];

              console.warn(
                `HTML text analysis found: ${htmlCorrections.length} corrections, ${htmlIssues.length} issues`
              );
              console.warn(
                `Image analysis found: ${allCorrections.length} corrections, ${allIssues.length} issues`
              );

              let finalHtml: string | null =
                modifiedHtmlContent || originalHtmlText;

              if (finalHtml && htmlCorrections.length > 0) {
                finalHtml = applyCorrectionsToHtml(finalHtml, htmlCorrections);
              }

              if (finalHtml && htmlIssues.length > 0) {
                finalHtml = applyCorrectionsToHtml(finalHtml, htmlIssues);
              }
              if (
                finalHtml &&
                finalHtml.includes('class="grammar-highlight"')
              ) {
                const highlightStyles = `
                  <style>
                    .grammar-highlight {
                      background-color: #fef08a;
                      padding: 2px 4px;
                      border-radius: 3px;
                      border-bottom: 2px solid #facc15;
                      cursor: help;
                      position: relative;
                    }
                    .grammar-highlight:hover {
                      background-color: #fde047;
                      border-bottom-color: #eab308;
                    }
                  </style>
                `;

                if (finalHtml.includes("</head>")) {
                  finalHtml = finalHtml.replace(
                    "</head>",
                    `${highlightStyles}</head>`
                  );
                } else if (finalHtml.includes("<head>")) {
                  finalHtml = finalHtml.replace(
                    "<head>",
                    `<head>${highlightStyles}`
                  );
                } else {
                  finalHtml = highlightStyles + finalHtml;
                }
              }

              resultData = {
                ...resultData,
                corrections: [...htmlCorrections, ...allCorrections],
                issues: [...htmlIssues, ...allIssues],
                image_results: extractedImageResults.map(
                  (r) => sanitizeBase64ForDB(r) as Record<string, unknown>
                ),
                image_marked_urls: imageMarkedUrls,
              };

              if (finalHtml) {
                resultData.output_content = finalHtml;
                resultData.marked_html = finalHtml;
              }
              console.warn(
                "[OpenAI] Starting analysis for suggestions and quality scores..."
              );
              try {
                const totalErrorsForPrompt =
                  htmlCorrections.length +
                  htmlIssues.length +
                  allCorrections.length +
                  allIssues.length;
                const correctionsSummary =
                  totalErrorsForPrompt > 0
                    ? [
                        ...htmlCorrections,
                        ...allCorrections,
                        ...htmlIssues,
                        ...allIssues,
                      ]
                        .slice(0, 30)
                        .map((c: unknown) => {
                          const o = c as Record<string, unknown>;
                          const orig =
                            o.original ??
                            o.original_word ??
                            o.incorrect ??
                            o.error_text ??
                            "";
                          const fix =
                            o.correction ??
                            o.corrected_word ??
                            o.correct ??
                            o.suggested ??
                            "";
                          return typeof orig === "string" &&
                            typeof fix === "string"
                            ? `"${orig}" -> "${fix}"`
                            : JSON.stringify(o);
                        })
                        .join("\n")
                    : "None.";
                const openAiPrompt = `You are a strict quality scorer for marketing copy. Analyze the HTML content and the list of spelling/grammar errors that were already found.

SCORING RULES (follow strictly):
- grammar: We will compute this from the error count; still return a value 0-100 (it will be overwritten). Many errors = low score.
- readability: 0-100. Penalize unclear phrasing, long sentences, jargon. Be strict.
- conversion: 0-100. How likely the copy is to drive action (click, sign-up). Weak or repeated CTAs = lower score.
- brandAlignment: 0-100. Consistency, tone, trust. Generic or off-brand = lower score.

Do not inflate scores. 70 is average; reserve 85+ for genuinely strong copy.

Return ONLY valid JSON (no markdown):
{
  "suggestions": [
    { "type": "improvement" | "conversion", "description": "suggestion text" }
  ],
  "qualityScore": {
    "grammar": 0-100,
    "readability": 0-100,
    "conversion": 0-100,
    "brandAlignment": 0-100
  }
}

Spelling/grammar corrections already found (use to gauge quality; grammar score will be overwritten by error count):
${correctionsSummary}

HTML content to analyze:`;

                const htmlTextForOpenAI =
                  modifiedHtmlContent || originalHtmlText || "";
                console.warn(
                  `[OpenAI] Sending ${htmlTextForOpenAI.length} chars to OpenAI (text only; no image)...`
                );
                const aiResult = await callOpenAI(
                  openAiPrompt + "\n" + htmlTextForOpenAI
                );

                console.warn(
                  "[OpenAI] Response received:",
                  JSON.stringify(aiResult, null, 2)
                );

                if (aiResult.suggestions) {
                  const suggestionsArray = Array.isArray(aiResult.suggestions)
                    ? aiResult.suggestions
                    : [];
                  console.warn(
                    `[OpenAI] Adding ${suggestionsArray.length} suggestions`
                  );
                  resultData.suggestions = aiResult.suggestions;
                }
                if (aiResult.qualityScore) {
                  console.warn(
                    "[OpenAI] Adding quality scores:",
                    aiResult.qualityScore
                  );
                  resultData.qualityScore = aiResult.qualityScore;
                }
                const totalErr =
                  (Array.isArray(resultData.corrections)
                    ? resultData.corrections.length
                    : 0) +
                  (Array.isArray(resultData.issues)
                    ? resultData.issues.length
                    : 0);
                if (
                  resultData.qualityScore &&
                  typeof resultData.qualityScore === "object"
                ) {
                  (resultData.qualityScore as Record<string, number>).grammar =
                    grammarScoreFromErrorCount(totalErr);
                }
              } catch (err) {
                console.error("OpenAI integration failed:", err);
              }
            }

            if (
              !isHtml &&
              resultData &&
              typeof resultData === "object" &&
              !Array.isArray(resultData)
            ) {
              const originalText = (resultData.original_text as string) || "";
              const correctedText = (resultData.corrected_text as string) || "";
              const textForAnalysis = [originalText, correctedText]
                .filter(Boolean)
                .join("\n\n--- Corrected ---\n\n");
              if (textForAnalysis.trim().length > 0) {
                console.warn(
                  "[OpenAI] Starting suggestions and quality scores for image/text creative (text only; image is NOT sent to OpenAI)..."
                );
                try {
                  const imgCorrections = Array.isArray(resultData.corrections)
                    ? resultData.corrections
                    : [];
                  const imgIssues = Array.isArray(resultData.issues)
                    ? resultData.issues
                    : [];
                  const imgErrorsSummary =
                    imgCorrections.length + imgIssues.length > 0
                      ? [...imgCorrections, ...imgIssues]
                          .slice(0, 30)
                          .map((c: unknown) => {
                            const o = c as Record<string, unknown>;
                            const orig =
                              o.original ??
                              o.original_word ??
                              o.incorrect ??
                              "";
                            const fix =
                              o.correction ??
                              o.corrected_word ??
                              o.correct ??
                              "";
                            return typeof orig === "string" &&
                              typeof fix === "string"
                              ? `"${orig}" -> "${fix}"`
                              : JSON.stringify(o);
                          })
                          .join("\n")
                      : "None.";
                  const openAiPrompt = `You are a strict quality scorer for marketing copy. This copy was extracted from an image or creative (we only send the extracted text to you; the image is not sent). Spelling/grammar corrections have already been applied; below are the errors that were found.

SCORING RULES (follow strictly):
- grammar: We will compute this from the error count; still return 0-100 (it will be overwritten).
- readability: 0-100. Be strict. Unclear or awkward phrasing = lower.
- conversion: 0-100. Weak or repeated CTAs = lower.
- brandAlignment: 0-100. Generic or off-brand = lower.

Do not inflate scores. 70 is average; 85+ only for strong copy.

Return ONLY valid JSON (no markdown):
{
  "suggestions": [
    { "type": "improvement" | "conversion", "description": "suggestion text" }
  ],
  "qualityScore": {
    "grammar": 0-100,
    "readability": 0-100,
    "conversion": 0-100,
    "brandAlignment": 0-100
  }
}

Spelling/grammar errors that were found (grammar score will be overwritten by error count):
${imgErrorsSummary}

Copy to analyze:`;

                  const aiResult = await callOpenAI(
                    openAiPrompt + "\n" + textForAnalysis.slice(0, 8000)
                  );
                  if (
                    aiResult.suggestions &&
                    Array.isArray(aiResult.suggestions)
                  ) {
                    resultData.suggestions = aiResult.suggestions;
                    console.warn(
                      `[OpenAI] Added ${aiResult.suggestions.length} suggestions for image creative`
                    );
                  }
                  if (
                    aiResult.qualityScore &&
                    typeof aiResult.qualityScore === "object"
                  ) {
                    resultData.qualityScore = aiResult.qualityScore as Record<
                      string,
                      number
                    >;
                    console.warn(
                      "[OpenAI] Added quality scores for image creative"
                    );
                  }
                  const totalErrImg = imgCorrections.length + imgIssues.length;
                  if (
                    resultData.qualityScore &&
                    typeof resultData.qualityScore === "object"
                  ) {
                    (
                      resultData.qualityScore as Record<string, number>
                    ).grammar = grammarScoreFromErrorCount(totalErrImg);
                  }
                } catch (err) {
                  console.error("OpenAI (image creative) failed:", err);
                }
              }
            }

            if (
              resultData &&
              typeof resultData === "object" &&
              !Array.isArray(resultData)
            ) {
              const totalErrors =
                (Array.isArray(resultData.corrections)
                  ? resultData.corrections.length
                  : 0) +
                (Array.isArray(resultData.issues)
                  ? resultData.issues.length
                  : 0);
              if (totalErrors >= 0) {
                if (
                  !resultData.qualityScore ||
                  typeof resultData.qualityScore !== "object"
                ) {
                  resultData.qualityScore = {
                    grammar: 100,
                    readability: 85,
                    conversion: 70,
                    brandAlignment: 75,
                  };
                }
                (resultData.qualityScore as Record<string, number>).grammar =
                  grammarScoreFromErrorCount(totalErrors);
              }
              const keys = Object.keys(resultData);
              console.warn(
                `Processing sync response with ${keys.length} keys:`,
                keys
              );

              for (const key of keys) {
                const value = resultData[key];
                if (
                  typeof value === "string" &&
                  value.startsWith("data:image/")
                ) {
                  try {
                    console.warn(
                      `Found Base64 image in sync response key: '${key}' (${value.length} chars). Converting...`
                    );
                    const matches = value.match(
                      /^data:(image\/([a-z]+));base64,(.+)$/
                    );
                    if (matches) {
                      const ext = matches[2];
                      const base64Data = matches[3];
                      const buffer = Buffer.from(base64Data, "base64");
                      const filename = `proofread-sync-${Date.now()}-${key}.${ext}`;
                      const uploaded = await saveBuffer(
                        buffer,
                        filename,
                        "proofread-results"
                      );
                      resultData[key] = uploaded.url;
                      if (
                        key === "output_content" ||
                        typeof (resultData as Record<string, unknown>)
                          .marked_image !== "string"
                      ) {
                        (resultData as Record<string, unknown>).marked_image =
                          uploaded.url;
                      }
                      console.warn(`✅ Converted & Saved: ${uploaded.url}`);
                    } else {
                      console.warn(
                        `⚠️ Base64 image format mismatch for key: ${key}`
                      );
                    }
                  } catch (err) {
                    console.error(`❌ Failed to save image for ${key}:`, err);
                  }
                } else if (
                  typeof value === "string" &&
                  (key.includes("image") || key.includes("marked"))
                ) {
                  console.warn(
                    `Found potential image URL in key '${key}':`,
                    value.substring(0, 100)
                  );
                }
              }
            }

            const grammarFeedback = extractGrammarFeedbackWithBusinessLogic(
              resultData,
              "completed"
            );

            const dbSafeResult = sanitizeBase64ForDB(resultData) as Record<
              string,
              unknown
            >;

            const [task] = await db
              .insert(externalTasks)
              .values({
                creativeId,
                userId,
                source: "grammar_ai",
                externalTaskId: data.task_id || `sync-${Date.now()}`,
                status: "completed",
                result: dbSafeResult,
                grammarFeedback,
                startedAt: new Date(),
                finishedAt: new Date(),
              })
              .returning();

            return {
              success: true,
              taskId: task.externalTaskId,
              dbTaskId: task.id,
              status: "completed",
              result: resultData,
            };
          }

          const [task] = await db
            .insert(externalTasks)
            .values({
              creativeId,
              userId,
              source: "grammar_ai",
              externalTaskId: data.task_id,
              status: "processing",
              startedAt: new Date(),
            })
            .returning();

          return { success: true, taskId: data.task_id, dbTaskId: task.id };
        } catch (fetchError) {
          lastError =
            fetchError instanceof Error
              ? fetchError
              : new Error(String(fetchError));

          if (lastError.name === "AbortError") {
            const delay = RETRY_DELAY_MS * attempt;
            console.warn(
              `Request timed out (attempt ${attempt}/${MAX_RETRIES}). Waiting ${delay / 1000}s...`
            );
            if (attempt < MAX_RETRIES) {
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }
            throw new Error(
              `AI Service request timed out after ${AI_TIMEOUT_MS / 1000} seconds. The service may be cold - please try again.`
            );
          }
          throw lastError;
        }
      }

      throw lastError || new Error("Failed after all retry attempts");
    } catch (error) {
      console.error("Grammar Submit Error:", error);
      throw error;
    }
  },

  async checkTaskStatus(externalTaskId: string) {
    try {
      const response = await fetch(`${AI_BASE_URL}/task/${externalTaskId}`);
      const data = (await response.json()) as {
        status: string;
        result?: Record<string, unknown>;
      };

      if (data.status === "SUCCESS") {
        if (data.result && typeof data.result === "object") {
          const keys = Object.keys(data.result);

          for (const key of keys) {
            const value = data.result[key];

            if (typeof value === "string" && value.startsWith("data:image/")) {
              try {
                console.warn(
                  `Found Base64 image in key: '${key}'. Converting...`
                );

                const matches = value.match(
                  /^data:(image\/([a-z]+));base64,(.+)$/
                );
                if (matches) {
                  const ext = matches[2];
                  const base64Data = matches[3];

                  const buffer = Buffer.from(base64Data, "base64");
                  const filename = `proofread-${externalTaskId}-${key}.${ext}`;

                  const uploaded = await saveBuffer(
                    buffer,
                    filename,
                    "proofread-results"
                  );

                  data.result[key] = uploaded.url;

                  console.warn(`Converted & Saved: ${uploaded.url}`);
                }
              } catch (err) {
                console.error(`Failed to save image for ${key}:`, err);
              }
            }
          }
        }

        const resultData =
          data.result && typeof data.result === "object"
            ? (data.result as Record<string, unknown>)
            : {};
        const grammarFeedback = extractGrammarFeedbackWithBusinessLogic(
          resultData,
          "completed"
        );

        await db
          .update(externalTasks)
          .set({
            status: "completed",
            result: data.result,
            grammarFeedback,
            finishedAt: new Date(),
          })
          .where(eq(externalTasks.externalTaskId, externalTaskId));
      } else if (data.status === "FAILURE") {
        await db
          .update(externalTasks)
          .set({
            status: "failed",
            errorMessage: "AI processing failed",
            finishedAt: new Date(),
          })
          .where(eq(externalTasks.externalTaskId, externalTaskId));
      }

      return data;
    } catch (error) {
      console.error("Polling Error:", error);
      return { status: "UNKNOWN" };
    }
  },

  async getTaskById(dbTaskId: string) {
    const [task] = await db
      .select()
      .from(externalTasks)
      .where(eq(externalTasks.id, dbTaskId))
      .limit(1);

    return task || null;
  },

  async getTasksByCreativeId(creativeId: string) {
    return db
      .select()
      .from(externalTasks)
      .where(eq(externalTasks.creativeId, creativeId))
      .orderBy(externalTasks.startedAt);
  },
};
