"use client"

import { useEffect, useState } from "react"
import { PerformanceDataPoint } from "@/lib/metrics"

interface UsePerformanceDataParams {
  tenant: string
  metricType: string
  period: string
}

export function usePerformanceData({ tenant, metricType, period }: UsePerformanceDataParams) {
  const [data, setData] = useState<PerformanceDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenant || !metricType || !period) {
      setLoading(false)
      return
    }

    async function fetchPerformanceData() {
      try {
        setLoading(true)
        const metricTypeMap: Record<string, string> = {
          "Total Assets": "totalAssets",
          "New Requests": "newRequests",
          "Approved Assets": "approvedAssets",
          "Rejected Assets": "rejectedAssets",
          "Pending Approval": "pendingApproval",
        }

        const periodMap: Record<string, string> = {
          "Today vs Yesterday": "today-vs-yesterday",
          "Current Week vs Last Week": "current-week-vs-last-week",
          "Current Month vs Last Month": "current-month-vs-last-month",
        }

        const dbMetricType = metricTypeMap[metricType] || "totalAssets"
        let dbPeriod = periodMap[period]

        if (!dbPeriod && period.startsWith("Today vs Last ")) {
          dbPeriod = "today-vs-same-day-last-week"
        }

        if (!dbPeriod) {
          dbPeriod = "today-vs-yesterday"
        }

        const response = await fetch(
          `/api/performance/${tenant}?metricType=${dbMetricType}&period=${dbPeriod}`
        )

        if (response.ok) {
          const result = await response.json()
          setData(result)
        } else {
          setData([])
        }
      } catch (error) {
        console.error("Error fetching performance data:", error)
        setData([])
      } finally {
        setLoading(false)
      }
    }

    fetchPerformanceData()
  }, [tenant, metricType, period])

  return { data, loading }
}

