import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { saveBuffer } from "@/lib/fileStorage";
import { externalTasks } from "@/lib/schema";

const AI_BASE_URL = process.env.GRAMMAR_AI_URL;
const AI_TIMEOUT_MS = 300000; // 5 minutes for image processing (24/7 plan - no cold starts)
const MAX_RETRIES = 3; // Retries for temporary issues (reduced since 24/7 plan)
const RETRY_DELAY_MS = 15000; // 15 seconds between retries (reduced for 24/7 plan)

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

    // Skip if already base64 - can't process these
    if (imgUrl.startsWith("data:")) {
      console.warn(`Skipping base64 image (model doesn't support base64)`);
      continue;
    }

    // Skip relative URLs that aren't HTTP
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

      // Generate filename from URL or index
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

async function processImageWithAI(
  blob: Blob,
  filename: string
): Promise<Record<string, unknown> | null> {
  if (!AI_BASE_URL) return null;

  const timeouts = [30000, 45000, 50000]; // 30s, 45s, 50s for each retry

  for (let attempt = 0; attempt < timeouts.length; attempt++) {
    const timeout = timeouts[attempt];

    const formData = new FormData();
    formData.append("file", blob, filename);
    formData.append("async_processing", "true");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      console.warn(
        `Processing image: ${filename} (attempt ${attempt + 1}/${timeouts.length}, timeout ${timeout / 1000}s)...`
      );
      const response = await fetch(`${AI_BASE_URL}/process?format=json`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`AI response error for ${filename}: ${response.status}`);
        if (attempt < timeouts.length - 1) {
          console.warn(`Retrying ${filename}...`);
          continue;
        }
        return null;
      }

      const data = await response.json();
      const resultData = (data.result || data) as Record<string, unknown>;
      const allKeys = Object.keys(resultData);
      console.warn(
        `AI response for ${filename}: status=${data.status}, keys=${allKeys.join(", ")}`
      );

      // Log any fields that might contain images
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
      clearTimeout(timeoutId);
      const isTimeout = err instanceof Error && err.name === "AbortError";
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

function applyCorrectionsToHtml(html: string, corrections: unknown[]): string {
  if (!corrections || corrections.length === 0) return html;

  let correctedHtml = html;
  let appliedCount = 0;

  for (const item of corrections) {
    if (!item || typeof item !== "object") continue;

    const correction = item as CorrectionItem;

    // Find the original/incorrect text (various possible field names from different AI response formats)
    let originalText =
      correction.original ||
      correction.incorrect ||
      correction.wrong ||
      correction.error ||
      correction.error_text ||
      correction.original_text ||
      correction.text ||
      correction.before;

    // Find the corrected text (various possible field names)
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

    // If standard fields not found, try to find any field that looks like original/corrected
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
      // Replace in HTML while preserving HTML tags
      const escapedOriginal = originalText.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );
      const regex = new RegExp(
        `(?<=>)([^<]*)(${escapedOriginal})([^<]*)(?=<)`,
        "gi"
      );

      const beforeReplace = correctedHtml;
      correctedHtml = correctedHtml.replace(
        regex,
        (match, before, found, after) => {
          return `${before}${correctedText}${after}`;
        }
      );

      // If regex didn't match (text might not be between tags), try simple replace
      if (correctedHtml === beforeReplace) {
        correctedHtml = correctedHtml.split(originalText).join(correctedText);
      }

      if (correctedHtml !== beforeReplace) {
        appliedCount++;
        console.warn(
          `Applied correction: "${originalText}" -> "${correctedText}"`
        );
      }
    }
  }

  console.warn(
    `Applied ${appliedCount}/${corrections.length} text corrections to HTML`
  );
  return correctedHtml;
}

export const GrammarService = {
  async warmupService(): Promise<{ success: boolean; message: string }> {
    if (!AI_BASE_URL) {
      return { success: false, message: "GRAMMAR_AI_URL not configured" };
    }

    try {
      // Try health check with retries to ensure service is actually ready
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
            // With 24/7 plan, service should always be ready - no need to wait
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
    userId?: string
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

      console.warn(
        `Starting Grammar Analysis for: ${fileUrl.substring(0, 100)}...`
      );

      // Quick health check (24/7 plan - service should always be ready)
      try {
        const healthRes = await fetch(`${AI_BASE_URL}/health`, {
          method: "GET",
        });
        console.warn(
          `Health check: ${healthRes.status} ${healthRes.ok ? "OK" : "FAILED"}`
        );
      } catch (healthErr) {
        console.warn("Health check error (proceeding anyway):", healthErr);
      }

      // Fetch the file and send as FormData (Render doesn't support URL parameter)
      let blob: Blob;
      let filename: string;

      if (fileUrl.startsWith("data:")) {
        // Handle Base64 data URLs
        const matches = fileUrl.match(/^data:([^;]+);base64,(.*)$/);
        if (!matches) {
          throw new Error("Invalid data URL format");
        }
        const mimeType = matches[1];
        const base64Data = matches[2];

        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: mimeType });

        const ext = mimeType.split("/").pop() || "png";
        filename = `creative.${ext}`;
        console.warn(
          `Data URL detected, filename: ${filename}, MIME type: ${mimeType}`
        );
      } else {
        // Fetch file from URL
        console.warn(`Fetching file from: ${fileUrl}`);
        const fileRes = await fetch(fileUrl);
        if (!fileRes.ok) {
          throw new Error(
            `Failed to download file from storage: ${fileRes.status}`
          );
        }
        blob = await fileRes.blob();

        // Extract filename from URL
        const urlObj = new URL(fileUrl);
        const pathParts = urlObj.pathname.split("/");
        const rawFilename = pathParts[pathParts.length - 1] || "file";
        filename = rawFilename;

        // Clean up filename (remove hash prefixes)
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

      // For HTML files, extract images and process them separately
      const isHtml =
        filename.endsWith(".html") ||
        filename.endsWith(".htm") ||
        blob.type === "text/html";
      const extractedImageResults: Array<Record<string, unknown>> = [];
      let modifiedHtmlContent: string | null = null;
      let originalHtmlText: string | null = null; // Store original HTML for applying corrections later

      // Track original URL to marked URL mapping (for HTML with images)
      const urlReplacements: Map<string, string> = new Map();

      if (isHtml) {
        console.warn(
          "HTML file detected, extracting images for separate processing..."
        );
        try {
          let htmlText = await blob.text();
          originalHtmlText = htmlText; // Keep original for applying corrections later
          const extractedImages = await extractImagesFromHtml(htmlText);

          if (extractedImages.length > 0) {
            console.warn(
              `Processing ${extractedImages.length} extracted images...`
            );

            // Process each image with the AI model
            for (const img of extractedImages) {
              const imgResult = await processImageWithAI(
                img.blob,
                img.filename
              );
              if (imgResult) {
                extractedImageResults.push(imgResult);

                // Get marked image URL from result
                const resultData = (imgResult.result || imgResult) as Record<
                  string,
                  unknown
                >;
                let markedUrl: string | null = null;

                const imgResultKeys = Object.keys(resultData);
                console.warn(
                  `Image result keys for ${img.filename}:`,
                  imgResultKeys.join(", ")
                );

                // Check various possible field names for marked image
                if (typeof resultData.marked_image === "string") {
                  markedUrl = resultData.marked_image;
                  console.warn(`Found marked_image for ${img.filename}`);
                } else if (typeof resultData.annotated_image === "string") {
                  markedUrl = resultData.annotated_image;
                  console.warn(`Found annotated_image for ${img.filename}`);
                } else if (typeof resultData.output_image === "string") {
                  markedUrl = resultData.output_image;
                  console.warn(`Found output_image for ${img.filename}`);
                } else if (typeof resultData.processed_image === "string") {
                  markedUrl = resultData.processed_image;
                  console.warn(`Found processed_image for ${img.filename}`);
                } else {
                  // Try to find any field with image data
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

                // If marked image is base64, convert to URL
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

            // Replace original image URLs with marked image URLs in HTML
            if (urlReplacements.size > 0) {
              console.warn(
                `Replacing ${urlReplacements.size} images in HTML with marked versions...`
              );
              for (const [originalUrl, markedUrl] of urlReplacements) {
                htmlText = htmlText.split(originalUrl).join(markedUrl);
              }
              // Save modified HTML content for the result
              modifiedHtmlContent = htmlText;
              console.warn(`HTML updated with marked images`);
            }

            console.warn(
              `Processed ${extractedImageResults.length}/${extractedImages.length} images successfully`
            );
          } else {
            // No images found, use original HTML for corrections
            modifiedHtmlContent = originalHtmlText;
            console.warn(
              "No images found in HTML, will apply text corrections only"
            );
          }

          // For HTML text analysis, strip images to focus on text content
          // This ensures the AI analyzes text without being distracted by images
          const textOnlyHtml = originalHtmlText.replace(
            /<img[^>]*>/gi,
            "<!-- image placeholder -->"
          );
          blob = new Blob([textOnlyHtml], { type: "text/html" });
          console.warn(
            `Sending text-only HTML for analysis (images stripped), size: ${(blob.size / 1024).toFixed(1)}KB`
          );
        } catch (extractErr) {
          console.warn(
            "Failed to extract/process images from HTML:",
            extractErr
          );
        }
      }

      const formData = new FormData();
      formData.append("file", blob, filename);
      formData.append("async_processing", "true");

      let lastError: Error | null = null;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.warn(
            `Sending file to AI service (attempt ${attempt}/${MAX_RETRIES}): ${AI_BASE_URL}/process?format=json`
          );

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

          let response: Response;
          try {
            const startTime = Date.now();

            response = await fetch(`${AI_BASE_URL}/process?format=json`, {
              method: "POST",
              body: formData,
              signal: controller.signal,
              keepalive: true,
            });
            clearTimeout(timeoutId);
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.warn(
              `Fetch completed in ${duration}s with status ${response.status}`
            );
          } catch (fetchErr) {
            clearTimeout(timeoutId);
            const fetchError = fetchErr as Error;
            console.error(
              `Fetch error after attempt ${attempt}:`,
              fetchError.name,
              fetchError.message
            );
            if (fetchError.name === "AbortError") {
              throw fetchErr;
            }
            throw new Error(`Network error: ${fetchError.message}`);
          }

          console.warn(
            `AI Response: status=${response.status}, statusText=${response.statusText}`
          );

          if (
            response.status === 502 ||
            response.status === 503 ||
            response.status === 504
          ) {
            const delay = RETRY_DELAY_MS * attempt; // Exponential backoff
            console.warn(
              `AI Service temporarily unavailable (${response.status}), attempt ${attempt}/${MAX_RETRIES}. Waiting ${delay / 1000}s...`
            );
            if (attempt < MAX_RETRIES) {
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }
            throw new Error(
              `AI Service temporarily unavailable (${response.status}). The service may be starting up - please try again in a few moments.`
            );
          }

          if (!response.ok) {
            const err = await response.text();
            console.error(`AI Service Error Response Body: "${err}"`);
            throw new Error(
              `AI Service Error (${response.status}): ${err || "Empty response"}`
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
            data = (await response.json()) as typeof data;
            console.warn(`AI Response data:`, {
              task_id: data.task_id,
              status: data.status,
              hasResult: !!data.result,
              resultKeys: data.result ? Object.keys(data.result) : [],
              topLevelKeys: Object.keys(data),
              hasMarkedImage:
                !!(data.result as Record<string, unknown>)?.marked_image ||
                !!data.marked_image,
            });
          } catch (_jsonError) {
            const text = await response.text();
            console.error(
              `Failed to parse AI response as JSON:`,
              text.substring(0, 500)
            );
            throw new Error(
              `AI Service returned invalid JSON: ${text.substring(0, 200)}`
            );
          }

          const isSync =
            data.task_id === "universal" ||
            data.status === "SUCCESS" ||
            data.corrections ||
            data.issues ||
            data.corrected_html ||
            data.result;

          if (isSync) {
            // For images, marked_image might be at top level or in result
            let resultData = (data.result || data) as Record<string, unknown>;

            // If marked_image is at top level, move it to result
            if (data.marked_image && typeof data.marked_image === "string") {
              resultData = { ...resultData, marked_image: data.marked_image };
            }

            // Process HTML text corrections (with or without images)
            if (isHtml && (modifiedHtmlContent || originalHtmlText)) {
              // Collect all corrections/issues from images (if any)
              const allCorrections: unknown[] = [];
              const allIssues: unknown[] = [];
              const imageMarkedUrls: string[] = [];

              if (extractedImageResults.length > 0) {
                console.warn(
                  `Merging ${extractedImageResults.length} image results with HTML results...`
                );

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

                  // Collect marked images from each processed image
                  if (typeof imgData.marked_image === "string") {
                    imageMarkedUrls.push(imgData.marked_image);
                  }
                }
              }

              // Get HTML text analysis results
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

              // Log first correction/issue structure for debugging
              if (htmlCorrections.length > 0) {
                console.warn(
                  "First correction structure:",
                  JSON.stringify(htmlCorrections[0], null, 2)
                );
              }
              if (htmlIssues.length > 0) {
                console.warn(
                  "First issue structure:",
                  JSON.stringify(htmlIssues[0], null, 2)
                );
              }

              // Build final HTML: Start with HTML that has marked images (or original if no images)
              let finalHtml: string | null =
                modifiedHtmlContent || originalHtmlText;

              // Apply text corrections from AI to the HTML
              if (finalHtml && htmlCorrections.length > 0) {
                console.warn("Applying text corrections to HTML...");
                finalHtml = applyCorrectionsToHtml(finalHtml, htmlCorrections);
              }

              // Also try to apply corrections from issues array (some AI responses put corrections there)
              if (finalHtml && htmlIssues.length > 0) {
                console.warn("Checking issues for corrections to apply...");
                finalHtml = applyCorrectionsToHtml(finalHtml, htmlIssues);
              }

              resultData = {
                ...resultData,
                corrections: [...htmlCorrections, ...allCorrections],
                issues: [...htmlIssues, ...allIssues],
                image_results: extractedImageResults,
                image_marked_urls: imageMarkedUrls,
              };

              // Add final HTML content with text corrections (and marked images if present)
              if (finalHtml) {
                resultData.output_content = finalHtml;
                resultData.marked_html = finalHtml;
                console.warn(
                  "Added final HTML with text corrections to result"
                );
              }

              const totalCorrections =
                htmlCorrections.length + allCorrections.length;
              const totalIssues = htmlIssues.length + allIssues.length;
              console.warn(
                `Total merged: ${totalCorrections} corrections, ${totalIssues} issues (HTML text + images)`
              );
            }

            // IMAGE OPTIMIZATION: Convert Base64 images to URLs for sync responses
            if (
              resultData &&
              typeof resultData === "object" &&
              !Array.isArray(resultData)
            ) {
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

            const [task] = await db
              .insert(externalTasks)
              .values({
                creativeId,
                userId,
                source: "grammar_ai",
                externalTaskId: data.task_id || `sync-${Date.now()}`,
                status: "completed",
                result: resultData,
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
            const delay = RETRY_DELAY_MS * attempt; // Exponential backoff
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
        // IMAGE OPTIMIZATION: Scan result for Base64 images and upload to blob storage
        if (data.result && typeof data.result === "object") {
          const keys = Object.keys(data.result);

          for (const key of keys) {
            const value = data.result[key];

            // Detect Base64 Image string (starts with data:image/...)
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

                  // Replace huge Base64 string with the URL
                  data.result[key] = uploaded.url;

                  console.warn(`Converted & Saved: ${uploaded.url}`);
                }
              } catch (err) {
                console.error(`Failed to save image for ${key}:`, err);
                // Keep original base64 as fallback so it still works
              }
            }
          }
        }

        await db
          .update(externalTasks)
          .set({
            status: "completed",
            result: data.result,
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
