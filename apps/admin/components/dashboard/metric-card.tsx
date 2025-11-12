"use client"

import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react"
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "@workspace/ui/lib/utils"

export interface MetricCardData {
  title: string
  value: string | number
  icon: LucideIcon
  iconBgColor?: string
  iconColor?: string
  today: {
    trend: "up" | "down"
    percentage: string
  }
  yesterday: string | number
  currentMonth: string | number
  lastMonth: string | number
}

interface MetricCardProps {
  data: MetricCardData
  className?: string
  personalizedColors?: {
    cardBackground?: string
    cardTitle?: string
    iconBackground?: string
    iconColor?: string
  }
}

export function MetricCard({ data, className, personalizedColors }: MetricCardProps) {
  const { title, value, icon: Icon, iconBgColor, iconColor, today, yesterday, currentMonth, lastMonth } = data
  const isPositive = today.trend === "up"

  const cardBgColor = personalizedColors?.cardBackground
  const cardTitleColor = personalizedColors?.cardTitle
  const iconBg = personalizedColors?.iconBackground ?? iconBgColor ?? "#f3f4f6"
  const iconCol = personalizedColors?.iconColor ?? iconColor ?? "#6b7280"

  return (
    <Card 
      className={`relative ${className} rounded-md`}
      style={cardBgColor ? { backgroundColor: cardBgColor } : undefined}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <h3 
          className="text-md font-semibold"
          style={cardTitleColor ? { color: cardTitleColor } : { color: "#6b7280" }}
        >
          {title}
        </h3>
        <div
          className="rounded-md p-2 flex items-center justify-center"
          style={{ backgroundColor: iconBg }}
        >
          <Icon 
            className="h-5 w-5" 
            style={{ color: iconCol }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-0">
        <div className="flex flex-row items-center justify-between">
          <p className="text-4xl font-bold tracking-tight">{value}</p>
          <div className="flex flex-col items-center gap-1.5 mt-2">
            <div className="text-xs text-muted-foreground font-medium">Today</div>
            <div className="flex flex-row items-center gap-1.5">
              {isPositive ? (
                <TrendingUp className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-red-600" />
              )}
              <div
                className={cn(
                  "text-xs font-medium",
                  isPositive ? "text-green-600" : "text-red-600"
                )}
              >
                {today.percentage}
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">Yesterday</span>
            <span className="text-sm font-medium text-foreground">{yesterday}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">Current Month</span>
            <span className="text-sm font-medium text-foreground">{currentMonth}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">Last Month</span>
            <span className="text-sm font-medium text-foreground">{lastMonth}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

