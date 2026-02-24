import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { getAuditLogs } from "@/features/admin/services/auditLogs.service";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

import { parseAuditLogsQueryParams } from "./utils";

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
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const authResult = requireAdmin(session);
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    // Use shared parsing function (same as export endpoint) to ensure consistency
    const validationResult = parseAuditLogsQueryParams(searchParams, {
      includePagination: true,
    });

    if (validationResult.success === false) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: validationResult.status }
      );
    }

    const params = validationResult.data;

    // Verify filter consistency: log the filters being used
    try {
      logger.app.info(
        {
          endpoint: "search",
          filters: {
            adminId: params.adminId || null,
            actionType: params.actionType || null,
            startDate: params.startDate?.toISOString() || null,
            endDate: params.endDate?.toISOString() || null,
          },
        },
        "Audit logs search request"
      );
    } catch (_logError) {
      // Logging error shouldn't block the request
      console.error("Error logging audit logs search request:", _logError);
    }

    // When includePagination is true, page and limit are guaranteed to be set (defaults: 1, 20)
    // But TypeScript doesn't know this, so we provide fallbacks
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    const result = await getAuditLogs({
      adminId: params.adminId,
      actionType: params.actionType,
      startDate: params.startDate,
      endDate: params.endDate,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Log error with full details
    try {
      logger.app.error(
        {
          endpoint: "search",
          error: message,
          errorStack,
        },
        "Audit logs search error"
      );
    } catch (_logError) {
      // Fallback to console if logger fails
      console.error("Get audit logs error:", error);
      console.error("Error stack:", errorStack);
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
