import type {
  AdminDashboardData,
  AdminStats,
  RecentRequest,
} from "../types/admin.types";

export const dummyAdminStats: AdminStats = {
  totalRequests: 1247,
  pendingRequests: 23,
  approvedRequests: 1156,
  rejectedRequests: 68,
  totalAdvertisers: 89,
  totalPublishers: 234,
  activeOffers: 45,
  totalRevenue: 125000,
};

export const dummyRecentRequests: RecentRequest[] = [
  {
    id: "1",
    advertiserName: "Tech Corp",
    publisherName: "Media Hub",
    status: "pending",
    createdAt: new Date("2024-12-10T10:30:00"),
    amount: 5000,
  },
  {
    id: "2",
    advertiserName: "Brand X",
    publisherName: "News Site",
    status: "approved",
    createdAt: new Date("2024-12-10T09:15:00"),
    amount: 3200,
  },
  {
    id: "3",
    advertiserName: "Startup Y",
    publisherName: "Blog Network",
    status: "rejected",
    createdAt: new Date("2024-12-10T08:00:00"),
    amount: 1500,
  },
  {
    id: "4",
    advertiserName: "Enterprise Z",
    publisherName: "Content Platform",
    status: "approved",
    createdAt: new Date("2024-12-09T16:45:00"),
    amount: 8500,
  },
  {
    id: "5",
    advertiserName: "Company A",
    publisherName: "News Portal",
    status: "pending",
    createdAt: new Date("2024-12-09T14:20:00"),
    amount: 4200,
  },
];

export const dummyAdminDashboardData: AdminDashboardData = {
  stats: dummyAdminStats,
  recentRequests: dummyRecentRequests,
};
