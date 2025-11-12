import { NextRequest, NextResponse } from "next/server";
import { getMetricsByTenantSlug, formatMetricValue } from "@/lib/metrics";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: tenantSlug } = await params;
    
    const metricsData = await getMetricsByTenantSlug(tenantSlug);

    const formattedMetrics = metricsData.map((metric) => ({
      metricType: metric.metricType,
      value: metric.todayValue,
      today: {
        trend: metric.trend,
        percentage: metric.todayPercentage,
      },
      yesterday: formatMetricValue(metric.yesterdayValue),
      currentMonth: formatMetricValue(metric.currentMonthValue),
      lastMonth: formatMetricValue(metric.lastMonthValue),
    }));

    return NextResponse.json(formattedMetrics);
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

