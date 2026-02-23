import {
  Box,
  MailPlus,
  MailCheck,
  MailX,
  Clock,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

import type { AdminDashboardData, AdminStats } from "../types/admin.types";
import type { DashboardStats } from "../types/dashboard.types";

function calculateTrendPercentage(
  today: number,
  yesterday: number
): {
  percentage: number;
  isPositive: boolean;
} {
  if (yesterday === 0) {
    return { percentage: today > 0 ? 100 : 0, isPositive: today > 0 };
  }
  const percentage = ((today - yesterday) / yesterday) * 100;
  return { percentage: Math.abs(percentage), isPositive: percentage >= 0 };
}

function getIconForTitle(title: string) {
  switch (title) {
    case "Total Assets":
      return Box;
    case "New Requests":
      return MailPlus;
    case "Approved Assets":
      return MailCheck;
    case "Rejected Assets":
      return MailX;
    case "Pending Approval":
      return Clock;
    default:
      return Box;
  }
}

function transformBackendStatsToFrontend(
  backendStats: DashboardStats
): AdminStats[] {
  const { totals, trends, historicalData } = backendStats;

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  const totalAssetsTrend = calculateTrendPercentage(
    trends.totalAssets.today,
    trends.totalAssets.yesterday
  );
  const newRequestsTrend = calculateTrendPercentage(
    trends.newRequests.today,
    trends.newRequests.yesterday
  );
  const approvedTrend = calculateTrendPercentage(
    trends.approved.today,
    trends.approved.yesterday
  );
  const rejectedTrend = calculateTrendPercentage(
    trends.rejected.today,
    trends.rejected.yesterday
  );
  const pendingTrend = calculateTrendPercentage(
    trends.pending.today,
    trends.pending.yesterday
  );

  return [
    {
      title: "Total Assets",
      value: trends.totalAssets.today,
      icon: getIconForTitle("Total Assets"),
      trend: {
        trendTextValue: "Today",
        textValue: `${Math.round(totalAssetsTrend.percentage)}%`,
        trendIconValue: totalAssetsTrend.isPositive ? TrendingUp : TrendingDown,
      },
      historicalData: [
        {
          label: "Yesterday",
          value: formatNumber(historicalData.totalAssets.yesterday),
        },
        {
          label: "Current Month",
          value: formatNumber(historicalData.totalAssets.currentMonth),
        },
        {
          label: "Last Month",
          value: formatNumber(historicalData.totalAssets.lastMonth),
        },
        { label: "Total", value: formatNumber(totals.totalAssets) },
      ],
    },
    {
      title: "New Requests",
      value: trends.newRequests.today,
      icon: getIconForTitle("New Requests"),
      trend: {
        trendTextValue: "Today",
        textValue: `${Math.round(newRequestsTrend.percentage)}%`,
        trendIconValue: newRequestsTrend.isPositive ? TrendingUp : TrendingDown,
      },
      historicalData: [
        {
          label: "Yesterday",
          value: formatNumber(historicalData.newRequests.yesterday),
        },
        {
          label: "Current Month",
          value: formatNumber(historicalData.newRequests.currentMonth),
        },
        {
          label: "Last Month",
          value: formatNumber(historicalData.newRequests.lastMonth),
        },
        { label: "Total", value: formatNumber(totals.newRequests) },
      ],
    },
    {
      title: "Approved Assets",
      value: trends.approved.today,
      icon: getIconForTitle("Approved Assets"),
      trend: {
        trendTextValue: "Today",
        textValue: `${Math.round(approvedTrend.percentage)}%`,
        trendIconValue: approvedTrend.isPositive ? TrendingUp : TrendingDown,
      },
      historicalData: [
        {
          label: "Yesterday",
          value: formatNumber(historicalData.approved.yesterday),
        },
        {
          label: "Current Month",
          value: formatNumber(historicalData.approved.currentMonth),
        },
        {
          label: "Last Month",
          value: formatNumber(historicalData.approved.lastMonth),
        },
        { label: "Total", value: formatNumber(totals.approved) },
      ],
    },
    {
      title: "Rejected Assets",
      value: trends.rejected.today,
      icon: getIconForTitle("Rejected Assets"),
      trend: {
        trendTextValue: "Today",
        textValue: `${Math.round(rejectedTrend.percentage)}%`,
        trendIconValue: rejectedTrend.isPositive ? TrendingUp : TrendingDown,
      },
      historicalData: [
        {
          label: "Yesterday",
          value: formatNumber(historicalData.rejected.yesterday),
        },
        {
          label: "Current Month",
          value: formatNumber(historicalData.rejected.currentMonth),
        },
        {
          label: "Last Month",
          value: formatNumber(historicalData.rejected.lastMonth),
        },
        { label: "Total", value: formatNumber(totals.rejected) },
      ],
    },
    {
      title: "Pending Approval",
      value: trends.pending.today,
      icon: getIconForTitle("Pending Approval"),
      trend: {
        trendTextValue: "Today",
        textValue: `${Math.round(pendingTrend.percentage)}%`,
        trendIconValue: pendingTrend.isPositive ? TrendingUp : TrendingDown,
      },
      historicalData: [
        {
          label: "Yesterday",
          value: formatNumber(historicalData.pending.yesterday),
        },
        {
          label: "Current Month",
          value: formatNumber(historicalData.pending.currentMonth),
        },
        {
          label: "Last Month",
          value: formatNumber(historicalData.pending.lastMonth),
        },
        { label: "Total", value: formatNumber(totals.pending) },
      ],
    },
  ];
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  try {
    const response = await fetch("/api/admin/dashboard/stats", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Unauthorized: Please log in as admin");
      }
      throw new Error(
        `Failed to fetch dashboard stats: ${response.statusText}`
      );
    }

    const backendStats: DashboardStats = await response.json();

    const stats = transformBackendStatsToFrontend(backendStats);

    return { stats };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    throw error;
  }
}
