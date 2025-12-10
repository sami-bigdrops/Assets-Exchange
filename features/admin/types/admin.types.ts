export interface AdminStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  totalAdvertisers: number;
  totalPublishers: number;
  activeOffers: number;
  totalRevenue: number;
}

export interface RecentRequest {
  id: string;
  advertiserName: string;
  publisherName: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  amount: number;
}

export interface AdminDashboardData {
  stats: AdminStats;
  recentRequests: RecentRequest[];
}
