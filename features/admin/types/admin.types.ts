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

export type RequestStatus =
  | "new"
  | "pending"
  | "approved"
  | "rejected"
  | "sent-back";

export type ApprovalStage = "admin" | "advertiser" | "completed";

/**
 * TODO: BACKEND - Database Schema Design
 *
 * Create database tables for the Request/Response workflow:
 *
 * 1. CREATE TABLE publisher_requests (
 *      id VARCHAR(255) PRIMARY KEY,
 *      date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 *      advertiser_name VARCHAR(255) NOT NULL,
 *      affiliate_id VARCHAR(50) NOT NULL,
 *      priority ENUM('High Priority', 'Medium Priority') NOT NULL,
 *      offer_id VARCHAR(50) NOT NULL,
 *      offer_name TEXT NOT NULL,
 *      client_id VARCHAR(50) NOT NULL,
 *      client_name VARCHAR(255) NOT NULL,
 *      creative_type VARCHAR(100) NOT NULL,
 *      creative_count INT NOT NULL,
 *      from_lines_count INT NOT NULL,
 *      subject_lines_count INT NOT NULL,
 *      status ENUM('new', 'pending', 'approved', 'rejected', 'sent-back') NOT NULL DEFAULT 'new',
 *      approval_stage ENUM('admin', 'advertiser', 'completed') NOT NULL DEFAULT 'admin',
 *      parent_request_id VARCHAR(255),
 *      child_response_id VARCHAR(255),
 *      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 *      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 *      created_by VARCHAR(255) NOT NULL,
 *      updated_by VARCHAR(255),
 *      FOREIGN KEY (parent_request_id) REFERENCES advertiser_responses(id) ON DELETE SET NULL,
 *      FOREIGN KEY (child_response_id) REFERENCES advertiser_responses(id) ON DELETE SET NULL,
 *      INDEX idx_status_approval (status, approval_stage),
 *      INDEX idx_date (date DESC),
 *      INDEX idx_affiliate_id (affiliate_id),
 *      INDEX idx_created_at (created_at DESC)
 *    );
 *
 * 2. CREATE TABLE advertiser_responses (
 *      id VARCHAR(255) PRIMARY KEY,
 *      date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 *      advertiser_name VARCHAR(255) NOT NULL,
 *      affiliate_id VARCHAR(50) NOT NULL,
 *      priority ENUM('High Priority', 'Medium Priority') NOT NULL,
 *      offer_id VARCHAR(50) NOT NULL,
 *      offer_name TEXT NOT NULL,
 *      client_id VARCHAR(50) NOT NULL,
 *      client_name VARCHAR(255) NOT NULL,
 *      creative_type VARCHAR(100) NOT NULL,
 *      creative_count INT NOT NULL,
 *      from_lines_count INT NOT NULL,
 *      subject_lines_count INT NOT NULL,
 *      status ENUM('new', 'pending', 'approved', 'rejected', 'sent-back') NOT NULL DEFAULT 'new',
 *      approval_stage ENUM('admin', 'advertiser', 'completed') NOT NULL DEFAULT 'advertiser',
 *      parent_request_id VARCHAR(255) NOT NULL,
 *      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 *      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 *      created_by VARCHAR(255) NOT NULL,
 *      updated_by VARCHAR(255),
 *      FOREIGN KEY (parent_request_id) REFERENCES publisher_requests(id) ON DELETE CASCADE,
 *      INDEX idx_status_approval (status, approval_stage),
 *      INDEX idx_parent_request (parent_request_id),
 *      INDEX idx_date (date DESC)
 *    );
 *
 * 3. CREATE TABLE request_status_history (
 *      id BIGINT AUTO_INCREMENT PRIMARY KEY,
 *      request_id VARCHAR(255) NOT NULL,
 *      request_type ENUM('publisher_request', 'advertiser_response') NOT NULL,
 *      old_status VARCHAR(50),
 *      new_status VARCHAR(50) NOT NULL,
 *      old_approval_stage VARCHAR(50),
 *      new_approval_stage VARCHAR(50) NOT NULL,
 *      action_by VARCHAR(255) NOT NULL,
 *      action_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 *      comments TEXT,
 *      INDEX idx_request_id (request_id),
 *      INDEX idx_action_timestamp (action_timestamp DESC)
 *    );
 *
 * 4. Implement database constraints:
 *    - Ensure data integrity with foreign key relationships
 *    - Add check constraints for valid status transitions
 *    - Implement triggers for automatic status_history logging
 *    - Add indexes for performance optimization on frequently queried fields
 *
 * 5. Consider implementing soft deletes with deleted_at column for audit purposes
 */
export interface Request {
  id: string;
  date: string;
  advertiserName: string;
  affiliateId: string;
  priority: string;
  offerId: string;
  offerName: string;
  clientId: string;
  clientName: string;
  creativeType: string;
  creativeCount: number;
  fromLinesCount: number;
  subjectLinesCount: number;
  status: RequestStatus;
  approvalStage: ApprovalStage;
  parentRequestId?: string;
  childResponseId?: string;
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
