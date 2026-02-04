/**
 * Query String Generator for Audit Logs Filters
 *
 * Generates URL query strings from filter state according to the following rules:
 * 1. Include action=[ACTION] only if Action is "APPROVE" or "REJECT"
 * 2. Include adminId=[ADMIN_ID] only if Admin is selected (non-empty)
 * 3. Include from=[FROM_DATE] if From date is set
 * 4. Include to=[TO_DATE] if To date is set
 * 5. Always include pagination parameters at the end
 */

export interface AuditLogsFilterState {
  selectedAction: string; // "All" | "APPROVE" | "REJECT"
  selectedAdmin: string; // Admin ID or empty string
  fromDate: string; // YYYY-MM-DD or empty string
  toDate: string; // YYYY-MM-DD or empty string
  currentPage: number; // Page number (default: 1)
  pageSize: number; // Items per page (default: 20)
}

/**
 * Generates a URL query string from audit logs filter state
 *
 * @param filters - Filter state object
 * @returns URL query string (without leading ?)
 *
 * @example
 * ```typescript
 * const queryString = generateAuditLogsQueryString({
 *   selectedAction: "APPROVE",
 *   selectedAdmin: "admin-123",
 *   fromDate: "2024-01-01",
 *   toDate: "2024-01-31",
 *   currentPage: 1,
 *   pageSize: 20
 * });
 * // Returns: "action=APPROVE&adminId=admin-123&from=2024-01-01&to=2024-01-31&page=1&limit=20"
 * ```
 */
export function generateAuditLogsQueryString(
  filters: AuditLogsFilterState
): string {
  const params = new URLSearchParams();

  // Rule 1: Action parameter - Include only if "APPROVE" or "REJECT"
  if (
    filters.selectedAction === "APPROVE" ||
    filters.selectedAction === "REJECT"
  ) {
    params.append("action", filters.selectedAction);
  }
  // Omit if "All"

  // Rule 2: Admin ID parameter - Include only if non-empty
  const trimmedAdmin = filters.selectedAdmin?.trim() || "";
  if (trimmedAdmin) {
    params.append("adminId", trimmedAdmin);
  }
  // Omit if empty

  // Rule 3: Date range parameters - Include only if non-empty
  const trimmedFromDate = filters.fromDate?.trim() || "";
  if (trimmedFromDate) {
    params.append("from", trimmedFromDate);
  }
  // Omit if empty

  const trimmedToDate = filters.toDate?.trim() || "";
  if (trimmedToDate) {
    params.append("to", trimmedToDate);
  }
  // Omit if empty

  // Rule 5: Pagination parameters - Always append at the end
  params.append("page", String(filters.currentPage));
  params.append("limit", String(filters.pageSize));

  // Rule 4: Return query string (URLSearchParams handles & concatenation and encoding)
  return params.toString();
}
