import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { saveBuffer } from "@/lib/fileStorage";
import { externalTasks } from "@/lib/schema";

const AI_BASE_URL = process.env.GRAMMAR_AI_URL;
const AI_TIMEOUT_MS = 180000; // 3 minutes to handle cold starts
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 10000; // 10 seconds between retries

export const GrammarService = {
  async warmupService(): Promise<{ success: boolean; message: string }> {
    if (!AI_BASE_URL) {
      return { success: false, message: "GRAMMAR_AI_URL not configured" };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${AI_BASE_URL}/health`, {
        method: "GET",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        return { success: true, message: "Service is warm and ready" };
      }
      return {
        success: false,
        message: `Health check returned ${response.status}`,
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

      let blob: Blob;
      let filename: string;

      if (fileUrl.startsWith("data:")) {
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
          `Data URL detected, Using filename: ${filename}, MIME type: ${mimeType}`
        );
      } else {
        const fileRes = await fetch(fileUrl);
        if (!fileRes.ok)
          throw new Error("Failed to download file from storage");
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
          const mimeType = blob.type;
          const ext = mimeType.split("/").pop() || "png";
          filename = `${filename}.${ext}`;
        }
        console.warn(
          `URL: Raw: ${rawFilename}, Using filename: ${filename}, MIME type: ${blob.type}`
        );
      }

      const formData = new FormData();
      formData.append("file", blob, filename);
      formData.append("async_processing", "true");

      let lastError: Error | null = null;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.warn(
            `Sending to AI service (attempt ${attempt}/${MAX_RETRIES}): ${AI_BASE_URL}/process?format=json`
          );

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

          const response = await fetch(`${AI_BASE_URL}/process?format=json`, {
            method: "POST",
            body: formData,
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          console.warn(
            `AI Response: status=${response.status}, statusText=${response.statusText}`
          );

          if (
            response.status === 502 ||
            response.status === 503 ||
            response.status === 504
          ) {
            console.warn(
              `AI Service temporarily unavailable (${response.status}), attempt ${attempt}/${MAX_RETRIES}`
            );
            if (attempt < MAX_RETRIES) {
              console.warn(`Waiting ${RETRY_DELAY_MS / 1000}s before retry...`);
              await new Promise((resolve) =>
                setTimeout(resolve, RETRY_DELAY_MS)
              );
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

          const data = (await response.json()) as {
            task_id: string;
            status?: string;
            corrections?: unknown[];
            issues?: unknown[];
            corrected_html?: string;
            result?: Record<string, unknown>;
          };

          const isSync =
            data.task_id === "universal" ||
            data.status === "SUCCESS" ||
            data.corrections ||
            data.issues ||
            data.corrected_html ||
            data.result;

          if (isSync) {
            const resultData = data.result || data;

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
            console.warn(
              `Request timed out (attempt ${attempt}/${MAX_RETRIES})`
            );
            if (attempt < MAX_RETRIES) {
              console.warn(`Waiting ${RETRY_DELAY_MS / 1000}s before retry...`);
              await new Promise((resolve) =>
                setTimeout(resolve, RETRY_DELAY_MS)
              );
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
