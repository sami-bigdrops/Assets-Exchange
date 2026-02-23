import type {
  ComparisonType,
  MetricType,
  PerformanceChartData,
} from "@/features/dashboard/types/dashboard.types";

export async function getAdvertiserPerformanceChartData(
  comparisonType: ComparisonType,
  metric: MetricType = "Total Assets"
): Promise<PerformanceChartData> {
  const params = new URLSearchParams();
  params.append("comparisonType", comparisonType);
  params.append("metric", metric);

  const res = await fetch(
    `/api/advertiser/dashboard/performance?${params.toString()}`,
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
