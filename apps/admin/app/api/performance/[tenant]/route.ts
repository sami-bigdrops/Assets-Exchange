import { NextRequest, NextResponse } from "next/server"
import { getPerformanceData, MetricType, PerformancePeriod } from "@/lib/metrics"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: tenantSlug } = await params
    const { searchParams } = new URL(request.url)
    
    const metricType = searchParams.get("metricType") as MetricType
    const period = searchParams.get("period") as PerformancePeriod

    if (!metricType || !period) {
      return NextResponse.json(
        { message: "metricType and period are required" },
        { status: 400 }
      )
    }

    const validMetricTypes: MetricType[] = [
      "totalAssets",
      "newRequests",
      "approvedAssets",
      "rejectedAssets",
      "pendingApproval",
    ]

    const validPeriods: PerformancePeriod[] = [
      "today-vs-yesterday",
      "today-vs-same-day-last-week",
      "current-week-vs-last-week",
      "current-month-vs-last-month",
    ]

    if (!validMetricTypes.includes(metricType)) {
      return NextResponse.json(
        { message: "Invalid metricType" },
        { status: 400 }
      )
    }

    if (!validPeriods.includes(period)) {
      return NextResponse.json(
        { message: "Invalid period" },
        { status: 400 }
      )
    }

    const data = await getPerformanceData(tenantSlug, metricType, period)

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching performance data:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

