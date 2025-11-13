"use client"

import { DashboardMetrics } from "@/components/dashboard/dashboard-metrics"
import { PerformanceOverview } from "@/components/dashboard/performance-overview"
import { usePersonalization } from "@/hooks/use-personalization"
import { PersonalizationSettings } from "@/lib/personalization"

interface DashboardPageClientProps {
  tenant: string
  initialPersonalization: PersonalizationSettings | null
}

export function DashboardPageClient({
  tenant,
  initialPersonalization,
}: DashboardPageClientProps) {
  const { settings } = usePersonalization(tenant, initialPersonalization)

  return (
    <div className="space-y-6">
      <DashboardMetrics
        tenant={tenant}
        personalizedColors={settings?.metricCardColors ?? undefined}
      />
      <PerformanceOverview
        tenant={tenant}
        personalizationSettings={initialPersonalization ?? settings ?? null}
      />
    </div>
  )
}

