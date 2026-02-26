import { db } from "@/lib/db";
import { externalCalls } from "@/lib/schema";

type ExternalCallInput = {
  service: string;
  endpoint: string;
  method?: string;
  requestSize?: number | null;
  responseTimeMs?: number | null;
  statusCode?: number | null;
  errorMessage?: string | null;
};

export async function logExternalCall(input: ExternalCallInput) {
  try {
    await db.insert(externalCalls).values({
      service: input.service,
      endpoint: input.endpoint,
      method: input.method ?? "GET",
      requestSize: input.requestSize ?? null,
      responseTimeMs: input.responseTimeMs ?? null,
      statusCode: input.statusCode ?? null,
      errorMessage: input.errorMessage ?? null,
    });
  } catch (err) {
    // Never break business logic if analytics logging fails
    console.error("[EXTERNAL_CALLS_LOG_ERROR]", err);
  }
}
