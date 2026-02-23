"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Request } from "@/features/admin/components/Request";
import { StatsCard } from "@/features/dashboard/components/StatsCard";

import { fetchAdvertiserRequests } from "../services/requests.client";
import { useAdvertiserDashboardViewModel } from "../view-models/useAdvertiserDashboardViewModel";

import { AdvertiserPerformanceChart } from "./AdvertiserPerformanceChart";

export function AdvertiserDashboard() {
  const { data, isLoading, error } = useAdvertiserDashboardViewModel();

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
            No data available for Advertiser Dashboard
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {data.stats.map((stat) => (
            <StatsCard key={stat.title} {...stat} />
          ))}
        </div>
      )}
      {!isLoading && <AdvertiserPerformanceChart />}
      {!isLoading && (
        <Request
          title="Incoming Admin Requests"
          fetcher={fetchAdvertiserRequests}
          viewAllLink="/advertiser/requests"
          isAdvertiserView={true}
        />
      )}
    </div>
  );
}
