import { type LucideIcon } from "lucide-react";

/**
 * Shared dashboard types for reusable components
 * Used by both admin and advertiser dashboards
 */

/**
 * Stats Card Props - Used for displaying statistics cards
 */
export interface StatsCardProps {
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
 * Performance Chart Types
 */
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
