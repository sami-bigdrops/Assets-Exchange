import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { getAuditLogs } from "@/features/admin/services/auditLogs.service";
import { auth } from "@/lib/auth";
import { auditLogsQuerySchema } from "@/lib/validations/admin";

export const dynamic = "force-dynamic";

type ValidatedQueryParams = {
  adminId?: string;
  actionType?: "APPROVE" | "REJECT";
  startDate?: Date;
  endDate?: Date;
  page: number;
  limit: number;
};

function parseAndValidateQueryParams(searchParams: URLSearchParams):
  | {
      success: true;
      data: ValidatedQueryParams;
    }
  | {
      success: false;
      error: string;
      status: number;
    } {
  try {
    const rawParams: Record<string, string | undefined> = {};

    // Support both adminId and adminID for backward compatibility
    const adminId = searchParams.get("adminId") || searchParams.get("adminID");
    if (adminId !== null) {
      rawParams.adminId = adminId.trim();
    }

    const actionType = searchParams.get("actionType");
    if (actionType !== null) {
      rawParams.actionType = actionType.trim().toUpperCase();
    }

    // Support both startDate/dateFrom and endDate/dateTo for backward compatibility
    const startDate =
      searchParams.get("startDate") || searchParams.get("dateFrom");
    if (startDate !== null) {
      rawParams.startDate = startDate.trim();
    }

    const endDate = searchParams.get("endDate") || searchParams.get("dateTo");
    if (endDate !== null) {
      rawParams.endDate = endDate.trim();
    }

    const page = searchParams.get("page");
    if (page !== null) {
      rawParams.page = page.trim();
    }

    const limit = searchParams.get("limit");
    if (limit !== null) {
      rawParams.limit = limit.trim();
    }

    const validationResult = auditLogsQuerySchema.safeParse(rawParams);

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      const errorMessage = firstError?.message || "Invalid query parameters";
      const path = firstError?.path.join(".") || "unknown";

      return {
        success: false,
        error: `${errorMessage} (${path})`,
        status: 400,
      };
    }

    const validated = validationResult.data;

    const normalized: ValidatedQueryParams = {
      page: validated.page,
      limit: validated.limit,
    };

    if (validated.adminId) {
      normalized.adminId = validated.adminId.trim();
    }

    if (validated.actionType) {
      normalized.actionType = validated.actionType as "APPROVE" | "REJECT";
    }

    if (validated.startDate) {
      const startDateStr = validated.startDate.trim();
      const startDate = new Date(startDateStr);

      if (isNaN(startDate.getTime())) {
        return {
          success: false,
          error: "Invalid startDate format. Expected ISO 8601 date string.",
          status: 400,
        };
      }

      if (!startDateStr.includes("T") && !startDateStr.includes(" ")) {
        startDate.setHours(0, 0, 0, 0);
      }

      normalized.startDate = startDate;
    }

    if (validated.endDate) {
      const endDateStr = validated.endDate.trim();
      const endDate = new Date(endDateStr);

      if (isNaN(endDate.getTime())) {
        return {
          success: false,
          error: "Invalid endDate format. Expected ISO 8601 date string.",
          status: 400,
        };
      }

      if (!endDateStr.includes("T") && !endDateStr.includes(" ")) {
        endDate.setHours(23, 59, 59, 999);
      }

      normalized.endDate = endDate;
    }

    if (
      normalized.startDate &&
      normalized.endDate &&
      normalized.startDate > normalized.endDate
    ) {
      return {
        success: false,
        error: "startDate must be less than or equal to endDate",
        status: 400,
      };
    }

    return {
      success: true,
      data: normalized,
    };
  } catch (_error) {
    return {
      success: false,
      error: "Failed to parse query parameters",
      status: 400,
    };
  }
}

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
    const validationResult = parseAndValidateQueryParams(searchParams);

    if (validationResult.success === false) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: validationResult.status }
      );
    }

    const params = validationResult.data;

    const result = await getAuditLogs({
      adminId: params.adminId,
      actionType: params.actionType,
      startDate: params.startDate,
      endDate: params.endDate,
      page: params.page,
      limit: params.limit,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("Get audit logs error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
