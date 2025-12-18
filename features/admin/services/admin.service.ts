/**
 * TODO: BACKEND - Admin Dashboard Statistics Service
 *
 * This file currently uses mock data. Replace with actual API calls to backend.
 *
 * Required Backend API Endpoint:
 * GET /api/admin/dashboard/stats
 *
 * Response Format:
 * {
 *   "success": true,
 *   "data": {
 *     "stats": [
 *       {
 *         "title": "Total Assets",
 *         "value": 1263,
 *         "trend": {
 *           "trendTextValue": "Today",
 *           "textValue": "43%",
 *           "trendIconValue": "trending-up" | "trending-down"
 *         },
 *         "historicalData": [
 *           { "label": "Yesterday", "value": "400" },
 *           { "label": "Current Month", "value": "25k" },
 *           { "label": "Last Month", "value": "10.8k" }
 *         ]
 *       },
 *       // ... other stats
 *     ]
 *   },
 *   "timestamp": "2024-12-20T10:30:00Z"
 * }
 *
 * Statistics to Calculate:
 *
 * 1. TOTAL ASSETS:
 *    - Count all records from publisher_requests + advertiser_responses
 *    - Query: SELECT COUNT(*) FROM (
 *               SELECT id FROM publisher_requests
 *               UNION ALL
 *               SELECT id FROM advertiser_responses
 *             ) AS total_assets;
 *    - Trend: Compare today's total vs yesterday's
 *    - Historical: Yesterday, Current Month, Last Month counts
 *
 * 2. NEW REQUESTS:
 *    - Count requests with status = 'new'
 *    - Query: SELECT COUNT(*) FROM publisher_requests
 *             WHERE status = 'new' AND approval_stage = 'admin';
 *    - Trend: Compare today's new requests vs yesterday's
 *    - Historical: Yesterday, Current Month, Last Month counts
 *
 * 3. APPROVED ASSETS:
 *    - Count requests with status = 'approved' and approval_stage = 'completed'
 *    - Query: SELECT COUNT(*) FROM publisher_requests
 *             WHERE status = 'approved' AND approval_stage = 'completed';
 *    - Trend: Compare today's approvals vs yesterday's
 *    - Historical: Yesterday, Current Month, Last Month counts
 *
 * 4. REJECTED ASSETS:
 *    - Count all rejected requests (both at admin and advertiser stage)
 *    - Query: SELECT COUNT(*) FROM (
 *               SELECT id FROM publisher_requests WHERE status = 'rejected'
 *               UNION ALL
 *               SELECT id FROM advertiser_responses WHERE status = 'rejected'
 *             ) AS rejected_assets;
 *    - Trend: Compare today's rejections vs yesterday's
 *    - Historical: Yesterday, Current Month, Last Month counts
 *
 * 5. PENDING APPROVAL:
 *    - Count requests awaiting approval (status = 'pending' or 'new')
 *    - Query: SELECT COUNT(*) FROM (
 *               SELECT id FROM publisher_requests WHERE status IN ('new', 'pending')
 *               UNION ALL
 *               SELECT id FROM advertiser_responses WHERE status = 'pending'
 *             ) AS pending_assets;
 *    - Trend: Compare current pending count vs yesterday's
 *    - Historical: Yesterday, Current Month, Last Month counts
 *
 * Trend Calculation Logic:
 * - Calculate percentage change: ((today - yesterday) / yesterday) * 100
 * - If positive: use "trending-up" icon
 * - If negative: use "trending-down" icon
 * - Format as absolute percentage (e.g., "43%", "13%")
 *
 * Historical Data Queries:
 * - Yesterday: WHERE DATE(created_at) = CURDATE() - INTERVAL 1 DAY
 * - Current Month: WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())
 * - Last Month: WHERE MONTH(created_at) = MONTH(CURDATE() - INTERVAL 1 MONTH) AND YEAR(created_at) = YEAR(CURDATE() - INTERVAL 1 MONTH)
 *
 * Caching Strategy:
 * - Cache key: 'admin:dashboard:stats'
 * - TTL: 2 minutes (120 seconds)
 * - Invalidate on: Request approval, rejection, or status change
 *
 * Performance Optimization:
 * - Use database views for frequently calculated metrics
 * - Pre-aggregate daily statistics in a separate table
 * - Run aggregation job every hour via cron/scheduler
 *
 * Example Aggregation Table:
 * CREATE TABLE dashboard_stats_cache (
 *   id BIGINT AUTO_INCREMENT PRIMARY KEY,
 *   stat_date DATE NOT NULL,
 *   stat_hour TINYINT NOT NULL,
 *   total_assets INT NOT NULL DEFAULT 0,
 *   new_requests INT NOT NULL DEFAULT 0,
 *   approved_assets INT NOT NULL DEFAULT 0,
 *   rejected_assets INT NOT NULL DEFAULT 0,
 *   pending_approval INT NOT NULL DEFAULT 0,
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   UNIQUE KEY unique_date_hour (stat_date, stat_hour)
 * );
 *
 * Error Handling:
 * - 401: Unauthorized
 * - 403: Forbidden (not admin)
 * - 500: Database query error
 */

import { dummyAdminDashboardData } from "../models/admin.model";
import type { AdminDashboardData } from "../types/admin.types";

/**
 * TODO: BACKEND - Replace with API call
 *
 * Implementation example:
 *
 * export async function getAdminDashboardData(): Promise<AdminDashboardData> {
 *   try {
 *     const response = await fetch('/api/admin/dashboard/stats', {
 *       method: 'GET',
 *       headers: {
 *         'Authorization': `Bearer ${getAuthToken()}`,
 *         'Content-Type': 'application/json'
 *       }
 *     });
 *
 *     if (!response.ok) {
 *       throw new Error(`Failed to fetch dashboard stats: ${response.statusText}`);
 *     }
 *
 *     const result = await response.json();
 *
 *     // Map backend response to frontend format
 *     // Note: Backend returns "trending-up" string, frontend needs the actual icon component
 *     return {
 *       stats: result.data.stats.map(stat => ({
 *         ...stat,
 *         icon: getIconComponent(stat.title), // Map title to Lucide icon
 *         trend: stat.trend ? {
 *           ...stat.trend,
 *           trendIconValue: getTrendIcon(stat.trend.trendIconValue) // Map string to icon component
 *         } : undefined
 *       }))
 *     };
 *
 *   } catch (error) {
 *     console.error('Error fetching dashboard stats:', error);
 *     throw error;
 *   }
 * }
 */
export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return dummyAdminDashboardData;
}
