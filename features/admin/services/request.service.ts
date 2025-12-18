/**
 * TODO: BACKEND - Request Service Layer
 *
 * This file currently uses mock data. Replace all mock data imports and
 * function implementations with actual API calls to the backend.
 *
 * Required Backend API Endpoints:
 * - GET  /api/admin/requests (with pagination, filtering, sorting)
 * - GET  /api/admin/requests/:id
 * - GET  /api/admin/responses (with pagination, filtering, sorting)
 * - GET  /api/admin/responses/:id
 * - POST /api/admin/requests/:id/approve
 * - POST /api/admin/requests/:id/reject
 * - POST /api/admin/requests/:id/send-back
 * - GET  /api/admin/requests/:id/related-response
 * - GET  /api/admin/responses/:id/related-request
 *
 * Authentication Requirements:
 * - All endpoints must validate JWT token
 * - Verify user has admin role/permissions
 * - Log all actions for audit trail
 */

import { allPublisherRequests } from "../models/request.model";
import { advertiserResponses } from "../models/response.model";
import type { Request } from "../types/admin.types";

/**
 * TODO: BACKEND - Implement getRequests API
 *
 * Replace with: GET /api/admin/requests
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
 * Error Handling:
 * - 401: Unauthorized (invalid/expired token)
 * - 403: Forbidden (not admin)
 * - 500: Internal Server Error
 */
export async function getRequests(): Promise<Request[]> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return [...allPublisherRequests];
}

/**
 * TODO: BACKEND - Implement getAllRequests with filtering
 *
 * Replace with: GET /api/admin/requests/all
 *
 * This endpoint should combine:
 * 1. All publisher requests from publisher_requests table
 * 2. Advertiser responses that were sent-back (status='sent-back' AND approvalStage='advertiser')
 *
 * SQL Query Example:
 * SELECT * FROM publisher_requests
 * UNION ALL
 * SELECT * FROM advertiser_responses
 * WHERE status = 'sent-back' AND approval_stage = 'advertiser'
 * ORDER BY date DESC
 *
 * Important: Ensure proper indexing on status and approval_stage columns for performance
 */
export async function getAllRequests(): Promise<Request[]> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const responsesSentBackToAdmin = advertiserResponses.filter(
    (resp) => resp.status === "sent-back" && resp.approvalStage === "advertiser"
  );

  return [...allPublisherRequests, ...responsesSentBackToAdmin];
}

/**
 * TODO: BACKEND - Implement getRecentPublisherRequests
 *
 * Replace with: GET /api/admin/requests/recent?limit={limit}
 *
 * Query Parameters:
 * - limit: number (default: 3) - Number of most recent requests to return
 *
 * SQL Query Example:
 * (SELECT * FROM publisher_requests
 *  UNION ALL
 *  SELECT * FROM advertiser_responses
 *  WHERE status = 'sent-back' AND approval_stage = 'advertiser')
 * ORDER BY date DESC
 * LIMIT ?
 *
 * Performance: Use LIMIT clause at database level, not application level
 * Cache: Consider caching this data with 1-minute TTL for dashboard performance
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

  const responsesSentBackToAdmin = advertiserResponses.filter(
    (resp) => resp.status === "sent-back" && resp.approvalStage === "advertiser"
  );

  const allRequests = [...allPublisherRequests, ...responsesSentBackToAdmin];

  const sorted = allRequests.sort((a, b) => {
    return parseDate(b.date).getTime() - parseDate(a.date).getTime();
  });

  return sorted.slice(0, limit);
}

/**
 * TODO: BACKEND - Implement getAllAdvertiserResponses
 *
 * Replace with: GET /api/admin/responses
 *
 * Query Parameters: Same as getRequests (pagination, filtering, sorting)
 *
 * Filter Condition:
 * - Exclude responses with status='sent-back' AND approvalStage='advertiser'
 *   (these appear in /requests page instead)
 *
 * SQL Query Example:
 * SELECT * FROM advertiser_responses
 * WHERE NOT (status = 'sent-back' AND approval_stage = 'advertiser')
 * ORDER BY date DESC
 */
export async function getAllAdvertiserResponses(): Promise<Request[]> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return advertiserResponses.filter(
    (resp) =>
      !(resp.status === "sent-back" && resp.approvalStage === "advertiser")
  );
}

/**
 * TODO: BACKEND - Implement getRecentAdvertiserResponses
 *
 * Replace with: GET /api/admin/responses/recent?limit={limit}
 *
 * SQL Query Example:
 * SELECT * FROM advertiser_responses
 * WHERE NOT (status = 'sent-back' AND approval_stage = 'advertiser')
 * ORDER BY date DESC
 * LIMIT ?
 *
 * Cache: Consider caching with 1-minute TTL for dashboard
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

  const filteredResponses = advertiserResponses.filter(
    (resp) =>
      !(resp.status === "sent-back" && resp.approvalStage === "advertiser")
  );

  const sorted = filteredResponses.sort((a, b) => {
    return parseDate(b.date).getTime() - parseDate(a.date).getTime();
  });

  return sorted.slice(0, limit);
}

/**
 * TODO: BACKEND - Implement getRequestById
 *
 * Replace with: GET /api/admin/requests/:id
 *
 * Path Parameters:
 * - id: string (request ID)
 *
 * Returns: Single Request object or 404 if not found
 *
 * Error Handling:
 * - 404: Request not found
 * - 401: Unauthorized
 * - 403: Forbidden
 */
export async function getRequestById(
  requestId: string
): Promise<Request | null> {
  await new Promise((resolve) => setTimeout(resolve, 100));

  return allPublisherRequests.find((req) => req.id === requestId) || null;
}

/**
 * TODO: BACKEND - Implement getResponseById
 *
 * Replace with: GET /api/admin/responses/:id
 *
 * Path Parameters:
 * - id: string (response ID)
 *
 * Returns: Single Request object (advertiser response) or 404 if not found
 */
export async function getResponseById(
  responseId: string
): Promise<Request | null> {
  await new Promise((resolve) => setTimeout(resolve, 100));

  return advertiserResponses.find((resp) => resp.id === responseId) || null;
}

/**
 * TODO: BACKEND - Implement getRelatedResponse
 *
 * Replace with: GET /api/admin/requests/:id/related-response
 *
 * Retrieves the advertiser response linked to a publisher request via childResponseId
 *
 * SQL Query Example:
 * SELECT ar.* FROM advertiser_responses ar
 * JOIN publisher_requests pr ON pr.child_response_id = ar.id
 * WHERE pr.id = ?
 */
export async function getRelatedResponse(
  requestId: string
): Promise<Request | null> {
  await new Promise((resolve) => setTimeout(resolve, 100));

  const request = allPublisherRequests.find((req) => req.id === requestId);
  if (!request || !request.childResponseId) {
    return null;
  }

  return (
    advertiserResponses.find((resp) => resp.id === request.childResponseId) ||
    null
  );
}

/**
 * TODO: BACKEND - Implement getRelatedRequest
 *
 * Replace with: GET /api/admin/responses/:id/related-request
 *
 * Retrieves the publisher request linked to an advertiser response via parentRequestId
 *
 * SQL Query Example:
 * SELECT pr.* FROM publisher_requests pr
 * JOIN advertiser_responses ar ON ar.parent_request_id = pr.id
 * WHERE ar.id = ?
 */
export async function getRelatedRequest(
  responseId: string
): Promise<Request | null> {
  await new Promise((resolve) => setTimeout(resolve, 100));

  const response = advertiserResponses.find((resp) => resp.id === responseId);
  if (!response || !response.parentRequestId) {
    return null;
  }

  return (
    allPublisherRequests.find((req) => req.id === response.parentRequestId) ||
    null
  );
}

/**
 * TODO: BACKEND - Implement Request Action APIs
 *
 * Create the following endpoints for request actions:
 *
 * 1. POST /api/admin/requests/:id/approve-and-forward
 *    - Updates request status from 'new' to 'pending'
 *    - Updates approvalStage from 'admin' to 'advertiser'
 *    - Creates advertiser_response record linked via parent_request_id
 *    - Updates publisher_request.child_response_id
 *    - Logs action in request_status_history
 *    - Sends notification to advertiser
 *    - Returns updated Request object
 *
 * 2. POST /api/admin/requests/:id/reject-and-send-back
 *    - Updates request status to 'rejected'
 *    - Keeps approvalStage as 'admin' or sets based on current stage
 *    - Logs action in request_status_history with rejection reason
 *    - Sends notification to publisher
 *    - Returns updated Request object
 *
 * 3. POST /api/admin/responses/:id/reject-and-send-back
 *    - Updates response status to 'sent-back'
 *    - Updates approvalStage to 'advertiser'
 *    - This makes the response appear in admin's /requests "Sent Back" tab
 *    - Logs action in request_status_history
 *    - Sends notification to advertiser
 *    - Returns updated Request object
 *
 * Request Body for all actions:
 * {
 *   comments?: string,  // Optional comments/reason for action
 *   actionBy: string    // Admin user ID performing the action
 * }
 *
 * Response Format:
 * {
 *   success: boolean,
 *   data: Request,
 *   message: string
 * }
 *
 * Important Business Logic:
 * - Validate current status before allowing state transitions
 * - Only 'new' requests at 'admin' stage can be approved/rejected by admin
 * - Only 'sent-back' responses at 'advertiser' stage can be rejected again
 * - Implement database transaction to ensure atomicity
 * - Update both publisher_requests.child_response_id and advertiser_responses.parent_request_id
 *
 * Error Handling:
 * - 400: Invalid status transition
 * - 404: Request/Response not found
 * - 401: Unauthorized
 * - 403: Forbidden (user not admin)
 * - 409: Conflict (request already processed)
 * - 500: Internal Server Error
 *
 * Security:
 * - Validate JWT token
 * - Check admin role/permissions
 * - Sanitize input (comments field)
 * - Rate limiting to prevent abuse
 * - Log all actions for audit trail
 */
