"use client";

import { useAdminDashboardViewModel } from "../view-models/useAdminDashboardViewModel";

import { PerformanceChart } from "./PerformanceChart";
import { Request } from "./Request";
import { Response } from "./Response";
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

  const { stats } = data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => (
          <StatsCard key={stat.title} {...stat} />
        ))}
      </div>
      <PerformanceChart />
      <Request />
      <Response />
    </div>
  );
}
