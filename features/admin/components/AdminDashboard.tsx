"use client";

import {
  CheckCircle2,
  ClipboardList,
  DollarSign,
  FileX,
  Megaphone,
  Target,
  UsersRound,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useAdminDashboardViewModel } from "../view-models/useAdminDashboardViewModel";

import { RecentRequestsTable } from "./RecentRequestsTable";
import { StatsCard } from "./StatsCard";

export function AdminDashboard() {
  const { data, isLoading, error } = useAdminDashboardViewModel();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-destructive">Error: {error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">No data available</div>
      </div>
    );
  }

  const { stats, recentRequests } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your platform statistics and recent activity
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Requests"
          value={stats.totalRequests.toLocaleString()}
          description="All time requests"
          icon={ClipboardList}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Pending Requests"
          value={stats.pendingRequests}
          description="Awaiting approval"
          icon={FileX}
        />
        <StatsCard
          title="Approved Requests"
          value={stats.approvedRequests}
          description="Successfully approved"
          icon={CheckCircle2}
          trend={{ value: 8, isPositive: true }}
        />
        <StatsCard
          title="Rejected Requests"
          value={stats.rejectedRequests}
          description="Declined requests"
          icon={FileX}
          trend={{ value: -3, isPositive: false }}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Advertisers"
          value={stats.totalAdvertisers}
          description="Active advertisers"
          icon={Megaphone}
        />
        <StatsCard
          title="Total Publishers"
          value={stats.totalPublishers}
          description="Active publishers"
          icon={UsersRound}
        />
        <StatsCard
          title="Active Offers"
          value={stats.activeOffers}
          description="Currently active"
          icon={Target}
        />
        <StatsCard
          title="Total Revenue"
          value={`$${stats.totalRevenue.toLocaleString()}`}
          description="All time revenue"
          icon={DollarSign}
          trend={{ value: 15, isPositive: true }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Requests</CardTitle>
          <CardDescription>
            Latest requests from advertisers and publishers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecentRequestsTable requests={recentRequests} />
        </CardContent>
      </Card>
    </div>
  );
}
