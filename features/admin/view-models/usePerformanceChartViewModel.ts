"use client";

import { useEffect, useState } from "react";

import type {
  ComparisonType,
  MetricType,
  PerformanceChartData,
} from "@/features/dashboard/types/dashboard.types";

import { getPerformanceChartData } from "../services/performance.client";

export function usePerformanceChartViewModel(
  comparisonType: ComparisonType,
  metric: MetricType = "Total Assets"
) {
  const [data, setData] = useState<PerformanceChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const chartData = await getPerformanceChartData(comparisonType, metric);
        setData(chartData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load chart data"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [comparisonType, metric]);

  return {
    data,
    isLoading,
    error,
  };
}
