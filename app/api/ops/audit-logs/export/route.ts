import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { parseAuditLogsQueryParams } from "@/app/api/admin/audit-logs/utils";
import { streamAuditLogsForExport } from "@/features/admin/services/auditLogs.service";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { withRequestContext } from "@/lib/requestContext";

export const dynamic = "force-dynamic";

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

export async function GET(req: Request) {
  return withRequestContext(async () => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      const authResult = requireAdmin(session);
      if (!authResult.authorized) {
        try {
          logger.warn({
            action: "audit-logs.export",
            error: authResult.error,
            userId: session?.user?.id,
            role: session?.user?.role,
          });
        } catch (_logError) {
          // Logging error shouldn't block the request
          console.error(
            "Error logging audit-logs.export auth warning:",
            _logError
          );
        }
        return NextResponse.json({ error: authResult.error }, { status: 401 });
      }

      const authorizedSession = authResult.session;
      if (!authorizedSession?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { searchParams } = new URL(req.url);
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

      try {
        logger.info({
          action: "audit-logs.export",
          actorId: authorizedSession.user.id,
          filters: {
            adminId: params.adminId,
            actionType: params.actionType,
            startDate: params.startDate?.toISOString(),
            endDate: params.endDate?.toISOString(),
          },
        });
      } catch (_logError) {
        // Logging error shouldn't block the request
        console.error("Error logging audit-logs.export request:", _logError);
      }

      // Create a ReadableStream from the async generator
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            // Write CSV header
            const header = "timestamp,admin_id,action_type,asset_id,metadata\n";
            controller.enqueue(encoder.encode(header));

            // Escape CSV field value
            const escapeCSVField = (value: unknown): string => {
              if (value === null || value === undefined) {
                return "";
              }
              const str = String(value);
              return `"${str.replace(/"/g, '""')}"`;
            };

            // Stream rows from the generator
            for await (const row of streamAuditLogsForExport({
              adminId: params.adminId,
              actionType: params.actionType,
              startDate: params.startDate,
              endDate: params.endDate,
            })) {
              const timestamp = row.createdAt.toISOString();
              const admin_id = row.userId;
              const action_type = row.action;
              const asset_id = row.entityId ?? null;
              const metadata = row.details ? JSON.stringify(row.details) : null;

              const csvRow = [
                escapeCSVField(timestamp),
                escapeCSVField(admin_id),
                escapeCSVField(action_type),
                escapeCSVField(asset_id),
                escapeCSVField(metadata),
              ].join(",");

              controller.enqueue(encoder.encode(csvRow + "\n"));
            }

            controller.close();
          } catch (error) {
            const errorObj =
              error instanceof Error ? error : new Error(String(error));
            controller.error(errorObj);
          }
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
      logger.error({
        action: "audit-logs.export",
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      return NextResponse.json(
        { error: "Failed to export audit logs" },
        { status: 500 }
      );
    }
  });
}
