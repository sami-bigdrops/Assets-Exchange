import type { StatsCardProps } from "@/features/dashboard/types/dashboard.types";

export type AdminStats = StatsCardProps;

export interface AdminDashboardData {
  stats: AdminStats[];
}

export type {
  ComparisonType,
  MetricType,
  PerformanceChartDataPoint,
  PerformanceChartData,
} from "@/features/dashboard/types/dashboard.types";
