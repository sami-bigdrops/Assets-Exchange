"use client"

import { useState, useMemo } from "react"
import { usePerformanceData } from "@/hooks/use-performance-data"
import {
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

interface PerformanceData {
  label: string
  todayValue: number
  yesterdayValue: number
}

const metricOptions = [
  "Total Assets",
  "New Requests",
  "Approved Assets",
  "Rejected Assets",
  "Pending Approval",
]

const defaultMetricColorMap: Record<
  string,
  { iconBgColor: string; iconColor: string }
> = {
  "Total Assets": {
    iconBgColor: "#ebe4ff",
    iconColor: "#5B3E96",
  },
  "New Requests": {
    iconBgColor: "#dbeafe",
    iconColor: "#1E40AF",
  },
  "Approved Assets": {
    iconBgColor: "#DAF3DC",
    iconColor: "#14532D",
  },
  "Rejected Assets": {
    iconBgColor: "#FFEDE3",
    iconColor: "#FF8743",
  },
  "Pending Approval": {
    iconBgColor: "#DBFBFC",
    iconColor: "#006D77",
  },
}

const getMetricColorMap = (
  metricCardColors?: {
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
  } | null
): Record<string, { iconBgColor: string; iconColor: string }> => {
  if (!metricCardColors) {
    return defaultMetricColorMap
  }

  return {
    "Total Assets": {
      iconBgColor: metricCardColors.totalAssetsIconBg ?? defaultMetricColorMap["Total Assets"]!.iconBgColor,
      iconColor: metricCardColors.totalAssetsIconColor ?? defaultMetricColorMap["Total Assets"]!.iconColor,
    },
    "New Requests": {
      iconBgColor: metricCardColors.newRequestsIconBg ?? defaultMetricColorMap["New Requests"]!.iconBgColor,
      iconColor: metricCardColors.newRequestsIconColor ?? defaultMetricColorMap["New Requests"]!.iconColor,
    },
    "Approved Assets": {
      iconBgColor: metricCardColors.approvedAssetsIconBg ?? defaultMetricColorMap["Approved Assets"]!.iconBgColor,
      iconColor: metricCardColors.approvedAssetsIconColor ?? defaultMetricColorMap["Approved Assets"]!.iconColor,
    },
    "Rejected Assets": {
      iconBgColor: metricCardColors.rejectedAssetsIconBg ?? defaultMetricColorMap["Rejected Assets"]!.iconBgColor,
      iconColor: metricCardColors.rejectedAssetsIconColor ?? defaultMetricColorMap["Rejected Assets"]!.iconColor,
    },
    "Pending Approval": {
      iconBgColor: metricCardColors.pendingApprovalIconBg ?? defaultMetricColorMap["Pending Approval"]!.iconBgColor,
      iconColor: metricCardColors.pendingApprovalIconColor ?? defaultMetricColorMap["Pending Approval"]!.iconColor,
    },
  }
}

const getLastWeekDayName = (): string => {
  const today = new Date()
  const sameDayLastWeek = new Date(today)
  sameDayLastWeek.setDate(today.getDate() - 7)
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  return days[sameDayLastWeek.getDay()] ?? "Sunday"
}


interface PerformanceOverviewProps {
  tenant: string
  personalizationSettings?: {
    metricCardColors?: {
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
    } | null
    colors?: {
      sectionHeaderBackground?: string
      sectionHeadingTextColor?: string
    } | null
  } | null
}

export function PerformanceOverview({
  tenant,
  personalizationSettings,
}: PerformanceOverviewProps) {
  const [selectedMetric, setSelectedMetric] = useState("Total Assets")
  const [selectedPeriod, setSelectedPeriod] = useState("Today vs Yesterday")
  const { data: chartData, loading } = usePerformanceData({
    tenant,
    metricType: selectedMetric,
    period: selectedPeriod,
  })

  const lastWeekDayName = getLastWeekDayName()
  const timePeriodOptions = [
    "Today vs Yesterday",
    `Today vs Last ${lastWeekDayName}`,
    "Current Week vs Last Week",
    "Current Month vs Last Month",
  ]

  const maxValue =
    chartData.length > 0
      ? Math.max(...chartData.map((d) => Math.max(d.todayValue, d.yesterdayValue)))
      : 100
  const yAxisMax = Math.ceil(maxValue / 50) * 50 || 100

  const getLegendLabels = () => {
    if (selectedPeriod === "Today vs Yesterday") {
      return { current: "Today", previous: "Yesterday" }
    } else if (selectedPeriod.startsWith("Today vs Last ")) {
      return { current: "Today", previous: lastWeekDayName }
    } else if (selectedPeriod === "Current Week vs Last Week") {
      return { current: "Current Week", previous: "Last Week" }
    } else if (selectedPeriod === "Current Month vs Last Month") {
      return { current: "Current Month", previous: "Last Month" }
    }
    return { current: "Current", previous: "Previous" }
  }

  const legendLabels = getLegendLabels()

  const metricColorMap = getMetricColorMap(personalizationSettings?.metricCardColors)
  const metricColors =
    metricColorMap[selectedMetric] ?? metricColorMap["Total Assets"]!
  const chartColor = metricColors.iconColor
  const chartBgColor = metricColors.iconBgColor

  const { headerStyle, titleStyle, sectionHeaderBg } = useMemo(() => {
    const sectionHeaderBg = personalizationSettings?.colors?.sectionHeaderBackground
    const sectionHeadingTextColor = personalizationSettings?.colors?.sectionHeadingTextColor

    const headerStyle: React.CSSProperties = {}
    const titleStyle: React.CSSProperties = {}

    if (sectionHeaderBg) {
      headerStyle.backgroundColor = sectionHeaderBg
    }
    if (sectionHeadingTextColor) {
      titleStyle.color = sectionHeadingTextColor
    }

    return { headerStyle, titleStyle, sectionHeaderBg }
  }, [personalizationSettings?.colors?.sectionHeaderBackground, personalizationSettings?.colors?.sectionHeadingTextColor])

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className={`flex flex-row items-center justify-between border-b ${
          sectionHeaderBg ? "-mx-6 -mt-6 px-12 py-6" : "pb-4"
        }`}
        style={Object.keys(headerStyle).length > 0 ? headerStyle : undefined}
      >
        <CardTitle
          className="text-lg font-semibold"
          style={Object.keys(titleStyle).length > 0 ? titleStyle : undefined}
        >
          Performance Overview
        </CardTitle>
        <div className="flex items-center gap-3">
          <Select value={selectedMetric} onValueChange={setSelectedMetric}>
            <SelectTrigger className="w-[240px] !bg-white">
              <SelectValue placeholder="Select metric" />
            </SelectTrigger>
            <SelectContent className="!bg-white">
              {metricOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[260px] !bg-white">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent className="!bg-white">
              {timePeriodOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {loading ? (
          <Skeleton className="h-[400px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTodayValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartBgColor} stopOpacity={0.9} />
                <stop offset="95%" stopColor={chartBgColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="label"
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              angle={selectedPeriod.includes("Month") ? -45 : 0}
              textAnchor={selectedPeriod.includes("Month") ? "end" : "middle"}
              height={selectedPeriod.includes("Month") ? 60 : 30}
            />
            <YAxis
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={[0, yAxisMax]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                padding: "8px 12px",
              }}
              labelStyle={{ color: "#6B7280", fontSize: "12px", marginBottom: "4px" }}
            />
            <Legend
              wrapperStyle={{ paddingTop: "20px" }}
              content={({ payload }) => (
                <div style={{ display: "flex", justifyContent: "center", gap: "24px" }}>
                  {payload?.map((entry, index) => {
                    const isArea = entry.dataKey === "todayValue"
                    return (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        {isArea ? (
                          <div
                            style={{
                              width: "14px",
                              height: "14px",
                              backgroundColor: chartColor,
                              borderRadius: "2px",
                            }}
                          />
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                            <div
                              style={{
                                width: "20px",
                                height: "2px",
                                backgroundColor: chartColor,
                              }}
                            />
                            <div
                              style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                backgroundColor: chartColor,
                              }}
                            />
                          </div>
                        )}
                        <span style={{ color: "#6B7280", fontSize: "12px" }}>
                          {entry.value}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            />
            <Area
              type="monotone"
              dataKey="todayValue"
              name={legendLabels.current}
              stroke={chartColor}
              fillOpacity={1}
              fill="url(#colorTodayValue)"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="yesterdayValue"
              name={legendLabels.previous}
              stroke={chartColor}
              strokeWidth={2}
              dot={{ fill: chartColor, r: 4 }}
              activeDot={{ r: 6 }}
            />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

