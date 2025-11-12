"use client"

import { useEffect, useState } from "react"

export interface MetricResponse {
  metricType: string
  value: number
  today: {
    trend: "up" | "down"
    percentage: string
  }
  yesterday: string
  currentMonth: string
  lastMonth: string
}

export function useMetrics(tenant: string) {
  const [metrics, setMetrics] = useState<MetricResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const response = await fetch(`/api/metrics/${tenant}`)
        if (response.ok) {
          const data = await response.json()
          setMetrics(data)
        }
      } catch (error) {
        console.error("Error fetching metrics:", error)
      } finally {
        setLoading(false)
      }
    }

    if (tenant) {
      fetchMetrics()
    }
  }, [tenant])

  return { metrics, loading }
}

