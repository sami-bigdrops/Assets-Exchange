"use client";

import { useCallback, useEffect, useState } from "react";

import { getAdminDashboardData } from "../services/dashboard.client";
import type { AdminDashboardData } from "../types/admin.types";

export function useAdminDashboardViewModel() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const dashboardData = await getAdminDashboardData();
      setData(dashboardData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard data"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const pollInterval = setInterval(() => void fetchData(), 30000);

    const handleRefresh = () => void fetchData();
    window.addEventListener("dashboard-refresh", handleRefresh);
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("dashboard-refresh", handleRefresh);
    };
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refresh: fetchData,
  };
}
