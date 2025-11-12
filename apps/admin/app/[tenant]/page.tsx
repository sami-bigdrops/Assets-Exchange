"use client"

import { useParams } from "next/navigation"
import { DashboardMetrics } from "@/components/dashboard/dashboard-metrics"
import { usePersonalization } from "@/hooks/use-personalization"

export default function Page() {
  const params = useParams()
  const tenant = params.tenant as string
  const { settings } = usePersonalization(tenant)

  return (
    <div className="space-y-6">
      <DashboardMetrics 
        tenant={tenant}
        personalizedColors={settings?.metricCardColors ?? undefined}
      />
    </div>
  )
}
