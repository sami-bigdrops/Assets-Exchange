"use client";

import { useEffect, useState } from "react";

import type { AdminDashboardData } from "@/features/admin/types/admin.types";

import { getAdvertiserDashboardData } from "../services/dashboard.client";

export function useAdvertiserDashboardViewModel() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const dashboardData = await getAdvertiserDashboardData();
        setData(dashboardData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard data"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return {
    data,
    isLoading,
    error,
  };
}
