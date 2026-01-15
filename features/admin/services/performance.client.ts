import type {
    ComparisonType,
    PerformanceChartData,
} from "@/features/dashboard/types/dashboard.types";

export async function getPerformanceChartData(
    comparisonType: ComparisonType
): Promise<PerformanceChartData> {
    const params = new URLSearchParams();
    params.append("comparisonType", comparisonType);

    const res = await fetch(`/api/admin/dashboard/performance?${params.toString()}`, {
        credentials: "include",
    });

    if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || "Failed to fetch performance data");
    }

    const result = await res.json();
    return result.data;
}
