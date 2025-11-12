"use client"

import { Package, MailPlus, Check, X, Clock, LucideIcon } from "lucide-react"
import { MetricCard, MetricCardData } from "./metric-card"
import { useMetrics } from "@/hooks/use-metrics"
import { Skeleton } from "@workspace/ui/components/skeleton"

interface DashboardMetricsProps {
  tenant: string
  personalizedColors?: {
    cardBackground?: string
    cardTitle?: string
    totalAssetsIconBg?: string
    totalAssetsIconColor?: string
    newRequestsIconBg?: string
    newRequestsIconColor?: string
    approvedAssetsIconBg?: string
    approvedAssetsIconColor?: string
    rejectedAssetsIconBg?: string
    rejectedAssetsIconColor?: string
    pendingApprovalIconBg?: string
    pendingApprovalIconColor?: string
  }
}

const metricConfig: Record<
  string,
  { title: string; icon: LucideIcon; iconBgColor: string; iconColor: string }
> = {
  totalAssets: {
    title: "Total Assets",
    icon: Package,
    iconBgColor: "#ebe4ff",
    iconColor: "#5B3E96",
  },
  newRequests: {
    title: "New Requests",
    icon: MailPlus,
    iconBgColor: "#dbeafe",
    iconColor: "#1E40AF",
  },
  approvedAssets: {
    title: "Approved Assets",
    icon: Check,
    iconBgColor: "#DAF3DC",
    iconColor: "#14532D",
  },
  rejectedAssets: {
    title: "Rejected Assets",
    icon: X,
    iconBgColor: "#FFEDE3",
    iconColor: "#FF8743",
  },
  pendingApproval: {
    title: "Pending Approval",
    icon: Clock,
    iconBgColor: "#DBFBFC",
    iconColor: "#006D77",
  },
}

export function DashboardMetrics({ tenant, personalizedColors }: DashboardMetricsProps) {
  const { metrics, loading } = useMetrics(tenant)

  const getIconColorsForCard = (title: string) => {
    if (!personalizedColors) return undefined

    switch (title) {
      case "Total Assets":
        return {
          cardBackground: personalizedColors.cardBackground,
          cardTitle: personalizedColors.cardTitle,
          iconBackground: personalizedColors.totalAssetsIconBg,
          iconColor: personalizedColors.totalAssetsIconColor,
        }
      case "New Requests":
        return {
          cardBackground: personalizedColors.cardBackground,
          cardTitle: personalizedColors.cardTitle,
          iconBackground: personalizedColors.newRequestsIconBg,
          iconColor: personalizedColors.newRequestsIconColor,
        }
      case "Approved Assets":
        return {
          cardBackground: personalizedColors.cardBackground,
          cardTitle: personalizedColors.cardTitle,
          iconBackground: personalizedColors.approvedAssetsIconBg,
          iconColor: personalizedColors.approvedAssetsIconColor,
        }
      case "Rejected Assets":
        return {
          cardBackground: personalizedColors.cardBackground,
          cardTitle: personalizedColors.cardTitle,
          iconBackground: personalizedColors.rejectedAssetsIconBg,
          iconColor: personalizedColors.rejectedAssetsIconColor,
        }
      case "Pending Approval":
        return {
          cardBackground: personalizedColors.cardBackground,
          cardTitle: personalizedColors.cardTitle,
          iconBackground: personalizedColors.pendingApprovalIconBg,
          iconColor: personalizedColors.pendingApprovalIconColor,
        }
      default:
        return {
          cardBackground: personalizedColors.cardBackground,
          cardTitle: personalizedColors.cardTitle,
        }
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    )
  }

  const metricCards: MetricCardData[] = metrics
    .map((metric) => {
      const config = metricConfig[metric.metricType]
      if (!config) {
        return null
      }

      return {
        title: config.title,
        value: metric.value.toString(),
        icon: config.icon,
        iconBgColor: config.iconBgColor,
        iconColor: config.iconColor,
        today: {
          trend: metric.today.trend,
          percentage: metric.today.percentage,
        },
        yesterday: metric.yesterday,
        currentMonth: metric.currentMonth,
        lastMonth: metric.lastMonth,
      } as MetricCardData
    })
    .filter((card): card is MetricCardData => card !== null)

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {metricCards.map((metric) => (
        <MetricCard 
          key={metric.title} 
          data={metric} 
          personalizedColors={getIconColorsForCard(metric.title)}
        />
      ))}
    </div>
  )
}

export type { MetricCardData }

