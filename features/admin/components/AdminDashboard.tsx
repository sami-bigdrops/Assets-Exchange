"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { AdminPerformanceChart } from "@/features/admin";
import { Request } from "@/features/admin";
import { Response } from "@/features/admin";
import { StatsCard } from "@/features/dashboard";

import { useAdminDashboardViewModel } from "../view-models/useAdminDashboardViewModel";

export function AdminDashboard() {
  const { data, isLoading, error } = useAdminDashboardViewModel();

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center justify-center p-8 border rounded-lg">
          <div className="text-destructive">Error: {error}</div>
        </div>
      ) : !data ? (
        <div className="flex items-center justify-center p-8 border rounded-lg">
          <div className="text-muted-foreground">
            No data available for Admin Dashboard
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {data.stats.map((stat) => (
            <StatsCard key={stat.title} {...stat} />
          ))}
        </div>
      )}
      {!isLoading && <AdminPerformanceChart />}
      {!isLoading && <Request />}
      {!isLoading && <Response />}
    </div>
  );
}
