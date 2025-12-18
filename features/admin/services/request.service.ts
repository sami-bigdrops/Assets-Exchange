/**
 * TODO: BACKEND - Unified Request Service Layer
 *
 * IMPORTANT: This service now uses the UNIFIED model where ONE creative
 * submission flows through the entire workflow as ONE record.
 *
 * Required Backend API Endpoints:
 * - GET  /api/admin/creative-requests (with pagination, filtering, sorting)
 * - GET  /api/admin/creative-requests/:id
 * - POST /api/admin/creative-requests/:id/admin-approve
 * - POST /api/admin/creative-requests/:id/admin-reject
 * - POST /api/admin/creative-requests/:id/advertiser-approve
 * - POST /api/admin/creative-requests/:id/advertiser-reject
 * - POST /api/admin/creative-requests/:id/advertiser-send-back
 * - GET  /api/admin/creative-requests/:id/history
 *
 * Authentication Requirements:
 * - All endpoints must validate JWT token
 * - Verify user has appropriate role (admin/advertiser)
 * - Log all actions for audit trail in creative_request_history table
 */

import { creativeRequests } from "../models/creative-request.model";
import type { Request } from "../types/admin.types";

/**
 * TODO: BACKEND - Implement getRequests API
 *
 * Replace with: GET /api/admin/creative-requests
 *
 * Query Parameters:
 * - page: number (default: 1)
 * - limit: number (default: 20)
 * - status: RequestStatus[] (optional filter)
 * - approvalStage: ApprovalStage[] (optional filter)
 * - priority: string[] (optional filter)
 * - search: string (optional - search by advertiserName, offerId, clientName)
 * - sortBy: string (date, priority, advertiserName)
 * - sortOrder: 'asc' | 'desc'
 *
 * Response:
 * {
 *   data: Request[],
 *   pagination: { total: number, page: number, limit: number, totalPages: number }
 * }
 *
 * Note: This returns ALL creative requests. Filter client-side or use query params.
 */
export async function getRequests(): Promise<Request[]> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return [...creativeRequests];
}

/**
 * TODO: BACKEND - Implement getAllRequests for /requests page
 *
 * Replace with: GET /api/admin/creative-requests?view=admin-requests
 *
 * For /requests page, show:
 * 1. All requests awaiting admin action (status='new', approvalStage='admin')
 * 2. All requests sent-back by advertiser (status='sent-back', approvalStage='advertiser')
 * 3. All other requests for reference (approved, rejected, pending)
 *
 * SQL Query Example:
 * SELECT * FROM creative_requests
 * ORDER BY submitted_at DESC
 *
 * Note: In unified model, NO UNION needed. It's all in one table!
 */
export async function getAllRequests(): Promise<Request[]> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  // In unified model, all data is in one array
  // The UI will filter based on tabs (status + approvalStage)
  return [...creativeRequests];
}

/**
 * TODO: BACKEND - Implement getRecentPublisherRequests for dashboard
 *
 * Replace with: GET /api/admin/creative-requests/recent?limit={limit}
 *
 * Query Parameters:
 * - limit: number (default: 3) - Number of most recent requests to return
 *
 * SQL Query Example:
 * SELECT * FROM creative_requests
 * ORDER BY submitted_at DESC
 * LIMIT ?
 *
 * Performance: Use LIMIT clause at database level
 * Cache: Consider caching with 1-minute TTL for dashboard
 *
 * Note: In unified model, NO UNION needed! Much simpler.
 */
export async function getRecentPublisherRequests(
  limit: number = 3
): Promise<Request[]> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const parseDate = (dateString: string): Date => {
    const match = dateString.match(
      /(\d{1,2})(?:st|nd|rd|th)\s+(\w+)\s+(\d{4})/
    );
    if (!match) return new Date(0);
    const [, day, month, year] = match;
    const monthMap: Record<string, number> = {
      january: 0,
      february: 1,
      march: 2,
      april: 3,
      may: 4,
      june: 5,
      july: 6,
      august: 7,
      september: 8,
      october: 9,
      november: 10,
      december: 11,
    };
    return new Date(
      parseInt(year),
      monthMap[month.toLowerCase()] || 0,
      parseInt(day)
    );
  };

  // Unified model: all data in one array
  const sorted = [...creativeRequests].sort((a, b) => {
    return parseDate(b.date).getTime() - parseDate(a.date).getTime();
  });

  return sorted.slice(0, limit);
}

/**
 * TODO: BACKEND - Implement getAllAdvertiserResponses for /response page
 *
 * Replace with: GET /api/admin/creative-requests?view=advertiser-responses
 *
 * For /response page, show requests that are with advertiser:
 * - status='pending' AND approvalStage='advertiser' (awaiting advertiser action)
 * - status='approved' AND approvalStage='completed' (advertiser approved)
 * - status='rejected' AND approvalStage='advertiser' (advertiser rejected)
 *
 * EXCLUDE:
 * - status='sent-back' AND approvalStage='advertiser' (these go to /requests page)
 *
 * SQL Query Example:
 * SELECT * FROM creative_requests
 * WHERE approval_stage IN ('advertiser', 'completed')
 *   AND NOT (status = 'sent-back' AND approval_stage = 'advertiser')
 * ORDER BY submitted_at DESC
 *
 * Note: Much cleaner with unified model!
 */
export async function getAllAdvertiserResponses(): Promise<Request[]> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Filter requests that are in advertiser stage or completed
  // but exclude sent-back items (they appear in /requests page)
  return creativeRequests.filter(
    (req) =>
      (req.approvalStage === "advertiser" ||
        req.approvalStage === "completed") &&
      !(req.status === "sent-back" && req.approvalStage === "advertiser")
  );
}

/**
 * TODO: BACKEND - Implement getRecentAdvertiserResponses for dashboard
 *
 * Replace with: GET /api/admin/creative-requests/recent?view=advertiser-responses&limit={limit}
 *
 * For dashboard "Incoming Advertiser Response" section, show recent requests
 * that are currently with advertiser (excluding sent-back).
 *
 * SQL Query Example:
 * SELECT * FROM creative_requests
 * WHERE approval_stage IN ('advertiser', 'completed')
 *   AND NOT (status = 'sent-back' AND approval_stage = 'advertiser')
 * ORDER BY submitted_at DESC
 * LIMIT ?
 *
 * Cache: 1-minute TTL for dashboard
 */
export async function getRecentAdvertiserResponses(
  limit: number = 3
): Promise<Request[]> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const parseDate = (dateString: string): Date => {
    const match = dateString.match(
      /(\d{1,2})(?:st|nd|rd|th)\s+(\w+)\s+(\d{4})/
    );
    if (!match) return new Date(0);
    const [, day, month, year] = match;
    const monthMap: Record<string, number> = {
      january: 0,
      february: 1,
      march: 2,
      april: 3,
      may: 4,
      june: 5,
      july: 6,
      august: 7,
      september: 8,
      october: 9,
      november: 10,
      december: 11,
    };
    return new Date(
      parseInt(year),
      monthMap[month.toLowerCase()] || 0,
      parseInt(day)
    );
  };

  // Filter for advertiser stage, exclude sent-back
  const filteredRequests = creativeRequests.filter(
    (req) =>
      (req.approvalStage === "advertiser" ||
        req.approvalStage === "completed") &&
      !(req.status === "sent-back" && req.approvalStage === "advertiser")
  );

  const sorted = filteredRequests.sort((a, b) => {
    return parseDate(b.date).getTime() - parseDate(a.date).getTime();
  });

  return sorted.slice(0, limit);
}

/**
 * TODO: BACKEND - Implement getRequestById
 *
 * Replace with: GET /api/admin/creative-requests/:id
 *
 * Path Parameters:
 * - id: string (request ID)
 *
 * Returns: Single Request object with complete history
 *
 * SQL Query Example:
 * SELECT * FROM creative_requests WHERE id = ?
 *
 * Response should include:
 * - All creative details
 * - Current status and approval stage
 * - Admin approval info (if exists)
 * - Advertiser response info (if exists)
 * - Complete history from creative_request_history table
 */
export async function getRequestById(
  requestId: string
): Promise<Request | null> {
  await new Promise((resolve) => setTimeout(resolve, 100));

  return creativeRequests.find((req) => req.id === requestId) || null;
}

/**
 * DEPRECATED: getResponseById, getRelatedResponse, getRelatedRequest
 *
 * These functions are NO LONGER NEEDED in the unified model.
 * Use getRequestById() instead - it returns the complete record with all approval info.
 *
 * Reason: In unified model, there's no separate "response" entity.
 * The advertiser's response is just a status update on the same request record.
 */

/**
 * TODO: BACKEND - Implement Request Action APIs (UNIFIED MODEL)
 *
 * All actions update the SAME record in creative_requests table.
 *
 * 1. POST /api/admin/creative-requests/:id/admin-approve
 *    What it does:
 *    - Updates status: 'new' → 'pending'
 *    - Updates approvalStage: 'admin' → 'advertiser'
 *    - Sets admin_status = 'approved'
 *    - Sets admin_approved_by, admin_approved_at, admin_comments
 *    - Logs action in creative_request_history
 *    - Sends notification to advertiser
 *    - Returns updated Request object
 *
 *    SQL Example:
 *    UPDATE creative_requests
 *    SET status = 'pending',
 *        approval_stage = 'advertiser',
 *        admin_status = 'approved',
 *        admin_approved_by = ?,
 *        admin_approved_at = NOW(),
 *        admin_comments = ?,
 *        updated_at = NOW()
 *    WHERE id = ? AND status = 'new' AND approval_stage = 'admin';
 *
 * 2. POST /api/admin/creative-requests/:id/admin-reject
 *    What it does:
 *    - Updates status: 'new' → 'rejected'
 *    - Keeps approvalStage as 'admin'
 *    - Sets admin_status = 'rejected'
 *    - Logs action with rejection reason
 *    - Sends notification to publisher
 *    - Returns updated Request object
 *
 *    SQL Example:
 *    UPDATE creative_requests
 *    SET status = 'rejected',
 *        admin_status = 'rejected',
 *        admin_approved_by = ?,
 *        admin_approved_at = NOW(),
 *        admin_comments = ?,
 *        updated_at = NOW()
 *    WHERE id = ? AND status = 'new' AND approval_stage = 'admin';
 *
 * 3. POST /api/admin/creative-requests/:id/advertiser-send-back
 *    What it does:
 *    - Updates status: 'pending' → 'sent-back'  OR  'sent-back' → 'rejected'
 *    - Updates approvalStage: stays 'advertiser'
 *    - Sets advertiser_status = 'sent_back'
 *    - Logs action
 *    - Sends notification to advertiser
 *    - Request now appears in admin's /requests "Sent Back" tab
 *
 *    SQL Example:
 *    UPDATE creative_requests
 *    SET status = 'sent-back',
 *        advertiser_status = 'sent_back',
 *        advertiser_responded_by = ?,
 *        advertiser_responded_at = NOW(),
 *        advertiser_comments = ?,
 *        updated_at = NOW()
 *    WHERE id = ? AND status IN ('pending', 'sent-back') AND approval_stage = 'advertiser';
 *
 * 4. POST /api/admin/creative-requests/:id/advertiser-approve
 *    (Called by advertiser, not admin)
 *    What it does:
 *    - Updates status: 'pending' → 'approved'
 *    - Updates approvalStage: 'advertiser' → 'completed'
 *    - Sets advertiser_status = 'approved'
 *    - Workflow is now complete
 *
 * 5. POST /api/admin/creative-requests/:id/advertiser-reject
 *    (Called by advertiser, not admin)
 *    What it does:
 *    - Updates status: 'pending' → 'rejected'
 *    - Keeps approvalStage: 'advertiser'
 *    - Sets advertiser_status = 'rejected'
 *
 * Request Body for all actions:
 * {
 *   comments?: string,  // Optional comments/reason
 *   actionBy: string    // User ID performing the action
 * }
 *
 * Response Format:
 * {
 *   success: boolean,
 *   data: {
 *     request: Request,  // Updated request object
 *     history: {         // Latest history entry
 *       action: string,
 *       actionBy: string,
 *       actionAt: Date,
 *       comments: string
 *     }
 *   },
 *   message: string
 * }
 *
 * Important Business Logic:
 * - Validate current status before allowing transitions
 * - Use database transaction for atomicity
 * - ALWAYS log in creative_request_history table
 * - Send appropriate notifications
 *
 * Valid State Transitions:
 * - new + admin → pending + advertiser (admin approve)
 * - new + admin → rejected + admin (admin reject)
 * - pending + advertiser → approved + completed (advertiser approve)
 * - pending + advertiser → rejected + advertiser (advertiser reject)
 * - pending + advertiser → sent-back + advertiser (advertiser send back)
 * - sent-back + advertiser → rejected + advertiser (admin final reject)
 */
