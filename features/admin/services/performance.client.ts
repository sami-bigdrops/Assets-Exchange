import type {
  ComparisonType,
  MetricType,
  PerformanceChartData,
} from "@/features/dashboard/types/dashboard.types";

type DateFilter = {
  startDate?: string;
  endDate?: string;
};

export async function getPerformanceChartData(
  comparisonType: ComparisonType,
  metric: MetricType = "Total Assets",
  dateFilter?: DateFilter
): Promise<PerformanceChartData> {
  const params = new URLSearchParams();

  params.append("comparisonType", comparisonType);
  params.append("metric", metric);

  // Only append when BOTH exist
  if (dateFilter?.startDate && dateFilter?.endDate) {
    params.append("startDate", dateFilter.startDate);
    params.append("endDate", dateFilter.endDate);
  }

  const res = await fetch(
    `/api/admin/dashboard/performance?${params.toString()}`,
    {
      credentials: "include",
    }
  );

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to fetch performance data");
  }

  const result = await res.json();
  return result.data;
}
