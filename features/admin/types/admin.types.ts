import { type LucideIcon } from "lucide-react";

export interface AdminStats {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: {
    trendTextValue: string;
    textValue: string;
    trendIconValue: LucideIcon;
  };
  historicalData?: Array<{
    label: string;
    value: number | string;
  }>;
}

/**
 * REQUEST STATUS represents the current state in the workflow
 * This is a UNIFIED model where ONE creative submission goes through multiple stages
 */
export type RequestStatus =
  | "new" // Just submitted by publisher, awaiting admin review
  | "pending" // Admin approved, forwarded to advertiser, awaiting advertiser response
  | "approved" // Advertiser approved, workflow complete
  | "rejected" // Rejected by either admin or advertiser
  | "sent-back"; // Advertiser sent back to admin for reconsideration

/**
 * APPROVAL STAGE indicates who is currently reviewing/has acted
 * - admin: Currently with admin or admin is the last actor
 * - advertiser: Currently with advertiser or advertiser is the last actor
 * - completed: Both admin and advertiser have approved
 */
export type ApprovalStage = "admin" | "advertiser" | "completed";

/**
 * TODO: BACKEND - UNIFIED Database Schema Design
 *
 * IMPORTANT: This is a SINGLE TABLE approach where ONE creative submission
 * goes through the entire approval workflow as ONE record.
 *
 * WORKFLOW:
 * 1. Publisher submits creative for an offer → status='new', approvalStage='admin'
 * 2. Admin approves → status='pending', approvalStage='advertiser'
 * 3. Advertiser approves → status='approved', approvalStage='completed'
 * OR Advertiser rejects → status='rejected', approvalStage='advertiser'
 * OR Advertiser sends back → status='sent-back', approvalStage='advertiser'
 *
 * CREATE TABLE creative_requests (
 *   -- Primary Identity
 *   id VARCHAR(255) PRIMARY KEY,
 *
 *   -- Offer & Creative Details (IMMUTABLE - set once, never changes)
 *   offer_id VARCHAR(50) NOT NULL,
 *   offer_name TEXT NOT NULL,
 *   creative_type VARCHAR(100) NOT NULL,
 *   creative_count INT NOT NULL,
 *   from_lines_count INT NOT NULL,
 *   subject_lines_count INT NOT NULL,
 *
 *   -- Parties Involved
 *   publisher_id VARCHAR(255) NOT NULL,
 *   publisher_name VARCHAR(255),
 *   advertiser_id VARCHAR(255) NOT NULL,
 *   advertiser_name VARCHAR(255) NOT NULL,
 *   affiliate_id VARCHAR(50) NOT NULL,
 *   client_id VARCHAR(50) NOT NULL,
 *   client_name VARCHAR(255) NOT NULL,
 *
 *   -- Current Workflow Status
 *   status ENUM('new', 'pending', 'approved', 'rejected', 'sent-back') NOT NULL DEFAULT 'new',
 *   approval_stage ENUM('admin', 'advertiser', 'completed') NOT NULL DEFAULT 'admin',
 *   priority ENUM('High Priority', 'Medium Priority') NOT NULL,
 *
 *   -- Admin Approval Tracking
 *   admin_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
 *   admin_approved_by VARCHAR(255),
 *   admin_approved_at TIMESTAMP,
 *   admin_comments TEXT,
 *
 *   -- Advertiser Response Tracking
 *   advertiser_status ENUM('pending', 'approved', 'rejected', 'sent_back'),
 *   advertiser_responded_by VARCHAR(255),
 *   advertiser_responded_at TIMESTAMP,
 *   advertiser_comments TEXT,
 *
 *   -- Timestamps
 *   submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 *   updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 *
 *   -- Indexes for Performance
 *   INDEX idx_status_stage (status, approval_stage),
 *   INDEX idx_admin_status (admin_status),
 *   INDEX idx_advertiser_status (advertiser_status),
 *   INDEX idx_submitted_at (submitted_at DESC),
 *   INDEX idx_offer_id (offer_id),
 *   INDEX idx_advertiser_id (advertiser_id)
 * ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
 *
 * -- Audit Trail Table (tracks every status change)
 * CREATE TABLE creative_request_history (
 *   id BIGINT AUTO_INCREMENT PRIMARY KEY,
 *   request_id VARCHAR(255) NOT NULL,
 *   action_type VARCHAR(100) NOT NULL,  -- 'admin_approved', 'advertiser_rejected', etc.
 *   old_status VARCHAR(50),
 *   new_status VARCHAR(50) NOT NULL,
 *   old_approval_stage VARCHAR(50),
 *   new_approval_stage VARCHAR(50) NOT NULL,
 *   action_by VARCHAR(255) NOT NULL,
 *   action_role ENUM('admin', 'advertiser', 'system') NOT NULL,
 *   comments TEXT,
 *   action_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 *
 *   FOREIGN KEY (request_id) REFERENCES creative_requests(id) ON DELETE CASCADE,
 *   INDEX idx_request_id (request_id),
 *   INDEX idx_action_at (action_at DESC)
 * ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
 */

/**
 * Request Interface - Represents ONE creative submission through entire workflow
 *
 * IMPORTANT: This is NOT two separate entities (request + response).
 * This is ONE entity that transitions through states:
 * Publisher Submit → Admin Review → Advertiser Review → Final Status
 */
export interface Request {
  // Identity
  id: string;
  date: string; // Submission date

  // Offer & Creative Details (immutable)
  offerId: string;
  offerName: string;
  creativeType: string;
  creativeCount: number;
  fromLinesCount: number;
  subjectLinesCount: number;

  // Parties
  advertiserName: string;
  affiliateId: string;
  clientId: string;
  clientName: string;
  priority: string;

  // Current State
  status: RequestStatus; // Where in the workflow
  approvalStage: ApprovalStage; // Who is currently handling or last acted

  // DEPRECATED FIELDS (kept for backward compatibility during refactor)
  // These will be removed once backend is properly unified
  parentRequestId?: string; // DO NOT USE - will be removed
  childResponseId?: string; // DO NOT USE - will be removed
}

export interface AdminDashboardData {
  stats: AdminStats[];
}

export type ComparisonType =
  | "Today vs Yesterday"
  | "Today vs Last Week"
  | "Current Week vs Last Week"
  | "Current Month vs Last Month";

export type MetricType =
  | "Total Assets"
  | "New Requests"
  | "Approved Assets"
  | "Rejected Assets"
  | "Pending Approval";

export interface PerformanceChartDataPoint {
  label: string;
  current: number;
  previous: number;
}

export interface PerformanceChartData {
  data: PerformanceChartDataPoint[];
  comparisonType: ComparisonType;
  xAxisLabel: string;
}

export interface Advertiser {
  id: string;
  advertiserName: string;
  advPlatform: string;
  createdMethod: string;
  status: "Active" | "Inactive";
}

export interface Publisher {
  id: string;
  publisherName: string;
  pubPlatform: string;
  createdMethod: string;
  status: "Active" | "Inactive";
}

export interface Offer {
  id: string;
  offerName: string;
  advName: string;
  createdMethod: string;
  status: "Active" | "Inactive";
  visibility: "Public" | "Internal" | "Hidden";
}
