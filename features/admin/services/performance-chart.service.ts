/**
 * TODO: BACKEND - Performance Chart Data Service
 *
 * This file currently uses mock data. Replace with actual API calls to backend.
 *
 * Required Backend API Endpoint:
 * GET /api/admin/dashboard/performance
 *
 * Query Parameters:
 * - comparisonType: "Today vs Yesterday" | "Today vs Last Week" | "Current Week vs Last Week" | "Current Month vs Last Month"
 * - metric: "Total Assets" | "New Requests" | "Approved Assets" | "Rejected Assets" | "Pending Approval" (optional, defaults to all)
 *
 * Response Format:
 * {
 *   "success": true,
 *   "data": {
 *     "comparisonType": "Today vs Yesterday",
 *     "xAxisLabel": "Time",
 *     "data": [
 *       {
 *         "label": "00:00",
 *         "current": 1250,
 *         "previous": 980
 *       },
 *       {
 *         "label": "01:00",
 *         "current": 890,
 *         "previous": 1100
 *       },
 *       // ... more data points
 *     ]
 *   },
 *   "timestamp": "2024-12-20T10:30:00Z"
 * }
 *
 * Data Aggregation by Comparison Type:
 *
 * 1. TODAY VS YESTERDAY (24 data points - hourly):
 *    - X-Axis: Time (00:00 - 23:00)
 *    - Current: Count of records created today, grouped by hour
 *    - Previous: Count of records created yesterday, grouped by hour
 *
 *    SQL Query Example:
 *    SELECT
 *      HOUR(created_at) as hour,
 *      DATE(created_at) as date,
 *      COUNT(*) as count
 *    FROM publisher_requests
 *    WHERE DATE(created_at) IN (CURDATE(), CURDATE() - INTERVAL 1 DAY)
 *    GROUP BY DATE(created_at), HOUR(created_at)
 *    ORDER BY date, hour;
 *
 * 2. TODAY VS LAST WEEK (24 data points - hourly):
 *    - X-Axis: Time (00:00 - 23:00)
 *    - Current: Count of records created today, grouped by hour
 *    - Previous: Count of records created last week same day, grouped by hour
 *
 *    SQL Query Example:
 *    SELECT
 *      HOUR(created_at) as hour,
 *      DATE(created_at) as date,
 *      COUNT(*) as count
 *    FROM publisher_requests
 *    WHERE DATE(created_at) IN (CURDATE(), CURDATE() - INTERVAL 7 DAY)
 *    GROUP BY DATE(created_at), HOUR(created_at)
 *    ORDER BY date, hour;
 *
 * 3. CURRENT WEEK VS LAST WEEK (7 data points - daily):
 *    - X-Axis: Day (Sun, Mon, Tue, Wed, Thu, Fri, Sat)
 *    - Current: Count of records for current week, grouped by day
 *    - Previous: Count of records for last week, grouped by day
 *
 *    SQL Query Example:
 *    SELECT
 *      DAYOFWEEK(created_at) as day_of_week,
 *      WEEK(created_at, 1) as week_number,
 *      COUNT(*) as count
 *    FROM publisher_requests
 *    WHERE created_at >= CURDATE() - INTERVAL 14 DAY
 *    GROUP BY WEEK(created_at, 1), DAYOFWEEK(created_at)
 *    ORDER BY week_number, day_of_week;
 *
 * 4. CURRENT MONTH VS LAST MONTH (31 data points - daily):
 *    - X-Axis: Date (01, 02, 03, ... 31)
 *    - Current: Count of records for current month, grouped by day
 *    - Previous: Count of records for last month, grouped by day
 *
 *    SQL Query Example:
 *    SELECT
 *      DAY(created_at) as day_of_month,
 *      MONTH(created_at) as month,
 *      YEAR(created_at) as year,
 *      COUNT(*) as count
 *    FROM publisher_requests
 *    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 2 MONTH)
 *    GROUP BY YEAR(created_at), MONTH(created_at), DAY(created_at)
 *    ORDER BY year, month, day_of_month;
 *
 * Metric-Specific Queries:
 *
 * Total Assets:
 *   SELECT ... FROM (
 *     SELECT created_at FROM publisher_requests
 *     UNION ALL
 *     SELECT created_at FROM advertiser_responses
 *   ) AS all_assets
 *
 * New Requests:
 *   WHERE status = 'new' AND approval_stage = 'admin'
 *
 * Approved Assets:
 *   WHERE status = 'approved' AND approval_stage = 'completed'
 *
 * Rejected Assets:
 *   WHERE status = 'rejected'
 *
 * Pending Approval:
 *   WHERE status IN ('new', 'pending')
 *
 * Data Formatting:
 * - Fill missing data points with 0
 * - For hourly data: ensure all 24 hours are present
 * - For weekly data: ensure all 7 days are present
 * - For monthly data: pad to match days in month (28-31)
 *
 * Caching Strategy:
 * - Cache key: 'admin:dashboard:performance:{comparisonType}'
 * - TTL: 5 minutes (300 seconds) for hourly/daily
 * - TTL: 15 minutes (900 seconds) for weekly/monthly
 * - Invalidate on: New requests, status changes
 *
 * Performance Optimization:
 * - Use database_stats_cache table for pre-aggregated data
 * - Only calculate real-time for today's data
 * - Historical data should be pre-calculated
 * - Use materialized views for complex aggregations
 *
 * Error Handling:
 * - 401: Unauthorized
 * - 403: Forbidden (not admin)
 * - 400: Invalid comparison type
 * - 500: Database query error
 */

import type {
  ComparisonType,
  PerformanceChartData,
} from "@/features/dashboard/types/dashboard.types";

import { getPerformanceChartDataByType } from "../models/performance-chart.model";

/**
 * TODO: BACKEND - Replace with API call
 *
 * Implementation example:
 *
 * export async function getPerformanceChartData(
 *   comparisonType: ComparisonType
 * ): Promise<PerformanceChartData> {
 *   try {
 *     const response = await fetch(
 *       `/api/admin/dashboard/performance?comparisonType=${encodeURIComponent(comparisonType)}`,
 *       {
 *         method: 'GET',
 *         headers: {
 *           'Authorization': `Bearer ${getAuthToken()}`,
 *           'Content-Type': 'application/json'
 *         }
 *       }
 *     );
 *
 *     if (!response.ok) {
 *       throw new Error(`Failed to fetch performance data: ${response.statusText}`);
 *     }
 *
 *     const result = await response.json();
 *     return result.data;
 *
 *   } catch (error) {
 *     console.error('Error fetching performance data:', error);
 *     throw error;
 *   }
 * }
 */
export async function getPerformanceChartData(
  comparisonType: ComparisonType
): Promise<PerformanceChartData> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  return getPerformanceChartDataByType(comparisonType);
}
