"use client";

import { useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";

import type {
  ComparisonType,
  MetricType,
  PerformanceChartData,
} from "@/features/dashboard/types/dashboard.types";

import { getPerformanceChartData } from "../services/performance.client";

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function usePerformanceChartViewModel(
  comparisonType: ComparisonType,
  metric: MetricType = "Total Assets",
  dateRange?: DateRange
) {
  const [data, setData] = useState<PerformanceChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Only send query params when BOTH from and to are selected
  const { startDate, endDate } = useMemo(() => {
    const from = dateRange?.from;
    const to = dateRange?.to;

    if (!from || !to) {
      return {
        startDate: undefined as string | undefined,
        endDate: undefined as string | undefined,
      };
    }

    return {
      startDate: toYMD(from),
      endDate: toYMD(to),
    };
  }, [dateRange?.from, dateRange?.to]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // IMPORTANT:
        // Update performance.client.ts to accept { startDate, endDate } (shown below)
        const chartData = await getPerformanceChartData(
          comparisonType,
          metric,
          {
            startDate,
            endDate,
          }
        );

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
  }, [comparisonType, metric, startDate, endDate]);

  return {
    data,
    isLoading,
    error,
  };
}
