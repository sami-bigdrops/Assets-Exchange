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

export interface Request {
  id: string;
  headerTitle: string;
  buttonTitle: string;
  requestHeader: RequestHeader[];
  viewRequests: ViewRequests[];
  approveRequest: ApproveRequest[];
  rejectRequest: RejectRequest[];
}
export interface RequestHeader {
  date: string;
  advertiserName: string;
  affId: string;
  priority: string;
}
export interface ViewRequests {
  offerId: string;
  offerName: string;
  buttonTitle: string;
}
export interface ApproveRequest {
  clientId: string;
  companyNameTitle: string;
  buttonTitle: string;
}
export interface RejectRequest {
  creativeTypeValue: string;
  creattiveCountValue: string;
  fromlinesCountValue: string;
  subjectlinesCountValue: string;
  buttonTitle: string;
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
