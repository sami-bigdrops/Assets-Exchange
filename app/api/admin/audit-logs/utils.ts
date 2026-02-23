/**
 * Shared query parameter parsing for audit logs endpoints.
 * Ensures consistent filter validation across search and export endpoints.
 */

export interface AuditLogsFilters {
  adminId?: string;
  actionType?: "APPROVE" | "REJECT";
  startDate?: Date;
  endDate?: Date;
}

export interface AuditLogsQueryParams extends AuditLogsFilters {
  page?: number;
  limit?: number;
}

export interface AuditLogsQueryParamsWithPagination extends AuditLogsFilters {
  page: number;
  limit: number;
}

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; status: number };

/**
 * Parses and validates audit logs query parameters.
 * Used by both search and export endpoints to ensure consistent filtering.
 */
export function parseAuditLogsQueryParams(
  searchParams: URLSearchParams,
  options?: { includePagination?: boolean }
): ParseResult<AuditLogsQueryParams> {
  const includePagination = options?.includePagination ?? true;

  try {
    // Extract query parameters (support multiple aliases for compatibility)
    const adminId = searchParams.get("adminId") || searchParams.get("adminID");
    const actionParam =
      searchParams.get("actionType") || searchParams.get("action");
    const startDateParam =
      searchParams.get("startDate") ||
      searchParams.get("dateFrom") ||
      searchParams.get("from");
    const endDateParam =
      searchParams.get("endDate") ||
      searchParams.get("dateTo") ||
      searchParams.get("to");
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    const result: AuditLogsQueryParams = {};

    // Parse adminId filter
    if (adminId && adminId.trim()) {
      result.adminId = adminId.trim();
    }

    // Parse and validate actionType filter (restricted to APPROVE | REJECT)
    if (actionParam && actionParam.trim()) {
      const actionUpper = actionParam.trim().toUpperCase();
      if (actionUpper !== "APPROVE" && actionUpper !== "REJECT") {
        return {
          success: false,
          error: "Invalid action type. Must be APPROVE or REJECT",
          status: 400,
        };
      }
      result.actionType = actionUpper as "APPROVE" | "REJECT";
    }

    // Parse and validate startDate filter
    if (startDateParam && startDateParam.trim()) {
      const startDate = new Date(startDateParam.trim());
      if (isNaN(startDate.getTime())) {
        return {
          success: false,
          error: "Invalid startDate format. Expected ISO 8601 date string.",
          status: 400,
        };
      }
      // If date-only (no time), set to start of day
      if (!startDateParam.includes("T") && !startDateParam.includes(" ")) {
        startDate.setHours(0, 0, 0, 0);
      }
      result.startDate = startDate;
    }

    // Parse and validate endDate filter
    if (endDateParam && endDateParam.trim()) {
      const endDate = new Date(endDateParam.trim());
      if (isNaN(endDate.getTime())) {
        return {
          success: false,
          error: "Invalid endDate format. Expected ISO 8601 date string.",
          status: 400,
        };
      }
      // If date-only (no time), set to end of day
      if (!endDateParam.includes("T") && !endDateParam.includes(" ")) {
        endDate.setHours(23, 59, 59, 999);
      }
      result.endDate = endDate;
    }

    // Validate date range
    if (
      result.startDate &&
      result.endDate &&
      result.startDate > result.endDate
    ) {
      return {
        success: false,
        error: "startDate must be less than or equal to endDate",
        status: 400,
      };
    }

    // Parse pagination parameters (only if requested)
    if (includePagination) {
      result.page = 1;
      result.limit = 20;

      if (pageParam) {
        const page = Number.parseInt(pageParam, 10);
        if (isNaN(page) || page < 1) {
          return {
            success: false,
            error: "Invalid page. Must be a positive integer.",
            status: 400,
          };
        }
        result.page = page;
      }

      if (limitParam) {
        const limit = Number.parseInt(limitParam, 10);
        if (isNaN(limit) || limit < 1 || limit > 100) {
          return {
            success: false,
            error: "Invalid limit. Must be between 1 and 100.",
            status: 400,
          };
        }
        result.limit = limit;
      }
    }

    return { success: true, data: result };
  } catch (_error) {
    return {
      success: false,
      error: "Failed to parse query parameters",
      status: 400,
    };
  }
}
