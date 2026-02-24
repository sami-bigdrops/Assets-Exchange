import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { streamAuditLogsForExport } from "@/features/admin/services/auditLogs.service";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

import { parseAuditLogsQueryParams, type AuditLogsFilters } from "../utils";

export const dynamic = "force-dynamic";

// Maximum rows to export without warning (prevents accidental unbounded exports)
const MAX_ROWS_WARNING_THRESHOLD = 10000;
const MAX_ROWS_HARD_LIMIT = 100000;

function requireAdmin(
  session: Awaited<ReturnType<typeof auth.api.getSession>>
) {
  if (!session?.user) {
    return { authorized: false, error: "Unauthorized" };
  }

  const role = session.user.role;

  if (role !== "admin" && role !== "administrator") {
    return { authorized: false, error: "Unauthorized" };
  }

  return { authorized: true, session };
}

/**
 * Creates a streaming CSV response for audit logs export.
 * Streams rows one-by-one without buffering, keeping memory usage constant.
 * Handles client disconnects and errors gracefully.
 *
 * Memory safety: This function processes one row at a time and never creates
 * large arrays or buffers. Each row is encoded and enqueued immediately.
 */
function createCSVStream({
  adminId,
  actionType,
  startDate,
  endDate,
  onRowCount,
  onComplete,
  onError,
}: AuditLogsFilters & {
  onRowCount?: (count: number) => void;
  onComplete?: (count: number, duration: number) => void;
  onError?: (error: Error, rowCount: number) => void;
}): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let isCancelled = false;
  let rowCount = 0;
  const startTime = Date.now();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // Write CSV header first with strict column mapping
        // This is a small constant-size string, not a buffer
        const header = "timestamp,admin_id,action_type,asset_id,metadata\n";

        // Check if cancelled before enqueueing
        if (isCancelled) {
          return;
        }

        controller.enqueue(encoder.encode(header));

        /**
         * Escapes a CSV field value properly.
         * Handles null/undefined, quotes, commas, and newlines.
         * This function processes one value at a time - no arrays created.
         */
        const escapeCSVField = (value: unknown): string => {
          // Handle null/undefined
          if (value === null || value === undefined) {
            return "";
          }

          const str = String(value);

          // Escape quotes by doubling them, then wrap entire field in quotes
          // This handles commas, newlines, and quotes properly
          return `"${str.replace(/"/g, '""')}"`;
        };

        // Stream rows one-by-one from the database generator
        // This never loads all rows into memory - processes one at a time
        // Each iteration processes a single row and enqueues it immediately
        for await (const row of streamAuditLogsForExport({
          adminId,
          actionType,
          startDate,
          endDate,
        })) {
          // Check for cancellation before processing each row
          if (isCancelled) {
            return;
          }

          // Hard limit protection: prevent accidental unbounded exports
          if (rowCount >= MAX_ROWS_HARD_LIMIT) {
            const error = new Error(
              `Export limit exceeded: maximum ${MAX_ROWS_HARD_LIMIT} rows allowed`
            );
            onError?.(error, rowCount);
            throw error;
          }

          // Map columns according to specification:
          // timestamp → created_at (ISO string)
          // admin_id → user_id
          // action_type → action
          // asset_id → entity_id (handle null)
          // metadata → details (JSON stringified, handle null)

          const timestamp = row.createdAt.toISOString();
          const admin_id = row.userId;
          const action_type = row.action;
          const asset_id = row.entityId ?? null;
          const metadata = row.details ? JSON.stringify(row.details) : null;

          // Build CSV row with proper escaping
          // This creates a single string per row, not an array that accumulates
          const csvRow = [
            escapeCSVField(timestamp),
            escapeCSVField(admin_id),
            escapeCSVField(action_type),
            escapeCSVField(asset_id),
            escapeCSVField(metadata),
          ].join(",");

          // Check again before enqueueing (client may have disconnected)
          if (isCancelled) {
            return;
          }

          // Enqueue row immediately (no buffering)
          // Each row is encoded to Uint8Array and sent immediately
          // No accumulation of rows in memory
          try {
            controller.enqueue(encoder.encode(csvRow + "\n"));
            rowCount++;

            // Notify row count periodically (every 1000 rows) for monitoring
            if (rowCount % 1000 === 0 && onRowCount) {
              onRowCount(rowCount);
            }
          } catch (_enqueueError) {
            // Controller may be closed (client disconnected)
            // Stop streaming gracefully
            return;
          }
        }

        // Successfully completed streaming
        if (!isCancelled) {
          const duration = Date.now() - startTime;
          controller.close();
          onComplete?.(rowCount, duration);
        }
      } catch (error) {
        // Handle errors gracefully
        const errorObj =
          error instanceof Error ? error : new Error(String(error));
        onError?.(errorObj, rowCount);

        if (!isCancelled) {
          // Only error if client is still connected
          try {
            controller.error(errorObj);
          } catch (_closeError) {
            // Controller may already be closed/aborted
            // Silently ignore - client likely disconnected
          }
        }
      }
    },
    cancel() {
      // Handle stream cancellation (client disconnect)
      isCancelled = true;
      // The async generator will be cleaned up automatically
      // when the for-await loop exits
    },
  });
}

export async function GET(req: Request) {
  const startTime = Date.now();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const authResult = requireAdmin(session);
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  const userId = authResult.session?.user?.id || "unknown";
  let rowCount = 0;

  try {
    const { searchParams } = new URL(req.url);
    // Use shared parsing function (same as search endpoint)
    const validationResult = parseAuditLogsQueryParams(searchParams, {
      includePagination: false,
    });

    if (validationResult.success === false) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: validationResult.status }
      );
    }

    const params = validationResult.data;

    // Log export start with filter details
    // This log format matches the search endpoint for consistency verification
    logger.app.info(
      {
        userId,
        endpoint: "export",
        filters: {
          adminId: params.adminId || null,
          actionType: params.actionType || null,
          startDate: params.startDate?.toISOString() || null,
          endDate: params.endDate?.toISOString() || null,
        },
      },
      "Audit logs export started"
    );

    // Create streaming CSV response (never buffers all rows in memory)
    const stream = createCSVStream({
      adminId: params.adminId,
      actionType: params.actionType,
      startDate: params.startDate,
      endDate: params.endDate,
      onRowCount: (count) => {
        rowCount = count;
        // Log warning for large exports
        if (count === MAX_ROWS_WARNING_THRESHOLD) {
          logger.app.warn(
            {
              userId,
              rowCount: count,
              threshold: MAX_ROWS_WARNING_THRESHOLD,
              filters: {
                adminId: params.adminId || null,
                actionType: params.actionType || null,
                startDate: params.startDate?.toISOString() || null,
                endDate: params.endDate?.toISOString() || null,
              },
            },
            "Large audit logs export detected"
          );
        }
      },
      onComplete: (finalRowCount, duration) => {
        rowCount = finalRowCount;
        const totalDuration = Date.now() - startTime;
        logger.app.success(
          {
            userId,
            rowCount: finalRowCount,
            durationMs: duration,
            totalDurationMs: totalDuration,
            rowsPerSecond:
              duration > 0 ? Math.round((finalRowCount / duration) * 1000) : 0,
          },
          "Audit logs export completed"
        );

        // Log warning if export was very large
        if (finalRowCount >= MAX_ROWS_WARNING_THRESHOLD) {
          logger.app.warn(
            {
              userId,
              rowCount: finalRowCount,
              durationMs: duration,
              exceededThreshold: true,
            },
            "Large audit logs export completed"
          );
        }
      },
      onError: (error, countAtError) => {
        rowCount = countAtError;
        const totalDuration = Date.now() - startTime;
        logger.app.error(
          {
            userId,
            error: error.message,
            errorStack: error.stack,
            rowCountAtError: countAtError,
            durationMs: totalDuration,
          },
          "Audit logs export failed"
        );
      },
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `audit-logs-${timestamp}.csv`;

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: unknown) {
    const totalDuration = Date.now() - startTime;
    const message =
      error instanceof Error ? error.message : "Internal server error";
    logger.app.error(
      {
        userId,
        error: message,
        errorStack: error instanceof Error ? error.stack : undefined,
        rowCount,
        durationMs: totalDuration,
      },
      "Audit logs export error"
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
