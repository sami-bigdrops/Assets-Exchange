/**
 * CREATIVE REQUESTS ANALYTICS - BUSINESS RULES
 *
 * This file defines the canonical business rules for analytics calculations
 * on the creative_requests table. All backend, cron, and frontend code
 * MUST use these rules to ensure consistency.
 *
 * IMPORTANT: These rules are the single source of truth for analytics logic.
 * Any changes to business rules must be updated here first, then propagated
 * to all consuming code.
 */

/**
 * BUSINESS RULE 1: Approved Status Definition
 *
 * A creative request is considered "Approved" if and only if:
 *   status = 'approved'
 *
 * Note: When status = 'approved', the approvalStage is always 'completed'
 * (set by advertiser approval), but we only check status for simplicity.
 *
 * DO NOT use approvalStage = 'completed' as a filter - it's redundant.
 */
export function isApprovedRequest(status: string): boolean {
  return status === "approved";
}

/**
 * BUSINESS RULE 2: Time to Approval Calculation
 *
 * Time to Approval is defined as:
 *   admin_approved_at - submitted_at
 *
 * This measures how long it took from submission until admin approval.
 * The advertiser approval time is NOT included in this metric.
 *
 * BUSINESS RULE 3: Time Calculation Eligibility
 *
 * Only include rows in time calculations where:
 *   status = 'approved' AND admin_approved_at IS NOT NULL
 *
 * This ensures we only calculate time for requests that:
 * 1. Are fully approved (status = 'approved')
 * 2. Have a valid admin approval timestamp
 */
export function canCalculateApprovalTime(
  status: string,
  adminApprovedAt: Date | null | undefined
): boolean {
  return status === "approved" && adminApprovedAt != null;
}

/**
 * Calculate approval time in milliseconds
 *
 * @param submittedAt - When the request was submitted
 * @param adminApprovedAt - When admin approved the request
 * @returns Time difference in milliseconds, or null if invalid
 */
export function calculateApprovalTimeMs(
  submittedAt: Date | null | undefined,
  adminApprovedAt: Date | null | undefined
): number | null {
  if (!submittedAt || !adminApprovedAt) {
    return null;
  }

  const submitted = new Date(submittedAt).getTime();
  const approved = new Date(adminApprovedAt).getTime();

  if (isNaN(submitted) || isNaN(approved)) {
    return null;
  }

  return approved - submitted;
}

/**
 * BUSINESS RULE 4: Top Publishers by Volume
 *
 * Top publishers are calculated by:
 * 1. Grouping all requests by publisher_id
 * 2. Counting requests per publisher
 * 3. Ordering by count descending
 * 4. Taking the top 5 publishers
 *
 * Note: This includes ALL requests (not just approved ones) for volume ranking.
 */
export interface TopPublisher {
  publisherId: string;
  requestCount: number;
}

export function calculateTopPublishers(
  requests: Array<{ publisherId: string }>,
  limit: number = 5
): TopPublisher[] {
  const publisherCounts = new Map<string, number>();

  requests.forEach((r) => {
    const count = publisherCounts.get(r.publisherId) || 0;
    publisherCounts.set(r.publisherId, count + 1);
  });

  return Array.from(publisherCounts.entries())
    .map(([publisherId, requestCount]) => ({
      publisherId,
      requestCount,
    }))
    .sort((a, b) => b.requestCount - a.requestCount)
    .slice(0, limit);
}

/**
 * Filter approved requests for analytics calculations
 *
 * @param requests - Array of creative requests
 * @returns Only requests that are approved (status = 'approved')
 */
export function filterApprovedRequests<T extends { status: string }>(
  requests: T[]
): T[] {
  return requests.filter((r) => isApprovedRequest(r.status));
}

/**
 * Filter requests eligible for approval time calculation
 *
 * @param requests - Array of creative requests with status and adminApprovedAt
 * @returns Only requests that can be used for time calculations
 */
export function filterApprovalTimeEligibleRequests<
  T extends { status: string; adminApprovedAt: Date | null | undefined },
>(requests: T[]): T[] {
  return requests.filter((r) =>
    canCalculateApprovalTime(r.status, r.adminApprovedAt)
  );
}

/**
 * Calculate average approval time from eligible requests
 *
 * @param requests - Array of requests with submittedAt and adminApprovedAt
 * @returns Average approval time in milliseconds, or null if no eligible requests
 */
export function calculateAverageApprovalTime<
  T extends {
    status: string;
    submittedAt: Date | null | undefined;
    adminApprovedAt: Date | null | undefined;
  },
>(requests: T[]): number | null {
  const eligible = filterApprovalTimeEligibleRequests(requests);

  if (eligible.length === 0) {
    return null;
  }

  const totalTime = eligible.reduce((sum, r) => {
    const time = calculateApprovalTimeMs(r.submittedAt, r.adminApprovedAt);
    return sum + (time ?? 0);
  }, 0);

  return Math.round(totalTime / eligible.length);
}
