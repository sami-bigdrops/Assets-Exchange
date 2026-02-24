"use client";

import { useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getVariables } from "@/components/_variables/variables";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import type {
  ComparisonType,
  MetricType,
  PerformanceChartData,
} from "../types/dashboard.types";

const getLastWeekDayName = (): string => {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const today = new Date();
  const dayName = days[today.getDay()];
  return dayName;
};

const normalizeComparisonType = (comparison: string): ComparisonType => {
  if (comparison.startsWith("Today vs Last")) {
    return "Today vs Last Week";
  }
  return comparison as ComparisonType;
};

interface PerformanceChartProps {
  data: PerformanceChartData | null;
  isLoading?: boolean;
  error?: string | null;
  onMetricChange?: (metric: MetricType) => void;
  onComparisonChange?: (comparison: ComparisonType) => void;
  defaultMetric?: MetricType;
  defaultComparison?: ComparisonType;
  metricOptions?: MetricType[];
}

export function PerformanceChart({
  data: chartData,
  isLoading = false,
  error = null,
  onMetricChange,
  onComparisonChange,
  defaultMetric = "Total Assets",
  defaultComparison = "Today vs Yesterday",
  metricOptions = [
    "Total Assets",
    "New Requests",
    "Approved Assets",
    "Rejected Assets",
    "Pending Approval",
  ],
}: PerformanceChartProps) {
  const variables = getVariables();
  const [selectedMetric, setSelectedMetric] =
    useState<MetricType>(defaultMetric);
  const [selectedComparison, setSelectedComparison] =
    useState<string>(defaultComparison);

  const lastWeekDayName = getLastWeekDayName();
  const comparisonOptions = [
    "Today vs Yesterday",
    `Today vs Last ${lastWeekDayName}`,
    "Current Week vs Last Week",
    "Current Month vs Last Month",
  ];

  const comparisonType = normalizeComparisonType(selectedComparison);

  const handleMetricChange = (value: string) => {
    const metric = value as MetricType;
    setSelectedMetric(metric);
    onMetricChange?.(metric);
  };

  const handleComparisonChange = (value: string) => {
    setSelectedComparison(value);
    const normalized = normalizeComparisonType(value);
    onComparisonChange?.(normalized);
  };

  const getMaxWidth = (options: string[]): string => {
    const maxLength = Math.max(...options.map((opt) => opt.length));
    return `${Math.max(maxLength * 9 + 80, 180)}px`;
  };

  const metricDropdownWidth = getMaxWidth(metricOptions);
  const comparisonDropdownWidth = getMaxWidth(comparisonOptions);

  const getLegendLabels = () => {
    switch (comparisonType) {
      case "Today vs Yesterday":
        return { current: "Today", previous: "Yesterday" };
      case "Today vs Last Week":
        return { current: "Today", previous: `Last ${lastWeekDayName}` };
      case "Current Week vs Last Week":
        return { current: "Current Week", previous: "Last Week" };
      case "Current Month vs Last Month":
        return { current: "Current Month", previous: "Last Month" };
      default:
        return { current: "Current", previous: "Previous" };
    }
  };

  const legendLabels = getLegendLabels();

  const getMetricColors = () => {
    switch (selectedMetric) {
      case "Total Assets":
        return {
          background: variables.colors.totalAssetsBackgroundColor,
          icon: variables.colors.totalAssetsIconColor,
        };
      case "New Requests":
        return {
          background: variables.colors.newRequestsBackgroundColor,
          icon: variables.colors.newRequestsIconColor,
        };
      case "Approved Assets":
        return {
          background: variables.colors.approvedAssetsBackgroundColor,
          icon: variables.colors.approvedAssetsIconColor,
        };
      case "Rejected Assets":
        return {
          background: variables.colors.rejectedAssetsBackgroundColor,
          icon: variables.colors.rejectedAssetsIconColor,
        };
      case "Pending Approval":
        return {
          background: variables.colors.pendingApprovalBackgroundColor,
          icon: variables.colors.pendingApprovalIconColor,
        };
      default:
        return {
          background: variables.colors.totalAssetsBackgroundColor,
          icon: variables.colors.totalAssetsIconColor,
        };
    }
  };

  const metricColors = getMetricColors();
  const gradientId = `colorPrevious-${selectedMetric.replace(/\s+/g, "-")}`;

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader
          className="-mt-6 mb-0 px-6 py-6 gap-4 flex flex-row items-center justify-between"
          style={{
            backgroundColor: variables.colors.cardHeaderBackgroundColor,
          }}
        >
          <CardTitle
            className="xl:text-lg text-sm lg:text-base font-inter font-medium"
            style={{ color: variables.colors.cardHeaderTextColor }}
          >
            Performance Overview
          </CardTitle>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-[180px] rounded-[6px]" />
            <Skeleton className="h-9 w-[200px] rounded-[6px]" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-[400px] w-full">
            {/* Chart skeleton with realistic bar pattern */}
            <div className="h-full w-full flex flex-col justify-end">
              <div className="flex items-end h-full gap-1.5 px-2">
                {Array.from({ length: 24 }).map((_, i) => {
                  // Create a wave-like pattern for the skeleton bars
                  const height = Math.sin((i / 24) * Math.PI * 2) * 30 + 50;
                  return (
                    <Skeleton
                      key={i}
                      className="flex-1 rounded-t"
                      style={{
                        height: `${height}%`,
                        minHeight: "20%",
                      }}
                    />
                  );
                })}
              </div>
              {/* X-axis skeleton */}
              <div className="flex justify-between px-2 mt-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-3 w-12" />
                ))}
              </div>
            </div>
          </div>
          {/* Legend skeleton */}
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="overflow-hidden">
        <CardHeader
          className="-mt-6 mb-0 px-6 py-6"
          style={{
            backgroundColor: variables.colors.cardHeaderBackgroundColor,
          }}
        >
          <CardTitle
            className="xl:text-lg text-sm lg:text-base font-inter font-medium"
            style={{ color: variables.colors.cardHeaderTextColor }}
          >
            Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px]">
            <div className="text-destructive">Error: {error}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData || !chartData.data || chartData.data.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardHeader
          className="-mt-6 mb-0 px-6 py-6"
          style={{
            backgroundColor: variables.colors.cardHeaderBackgroundColor,
          }}
        >
          <CardTitle
            className="xl:text-lg text-sm lg:text-base font-inter font-medium"
            style={{ color: variables.colors.cardHeaderTextColor }}
          >
            Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px]">
            <div className="text-muted-foreground">No data available</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="-mt-6 mb-0 px-6 py-6 gap-4 flex flex-row items-center justify-between"
        style={{ backgroundColor: variables.colors.cardHeaderBackgroundColor }}
      >
        <CardTitle
          className="xl:text-lg text-sm lg:text-base font-inter font-medium"
          style={{ color: variables.colors.cardHeaderTextColor }}
        >
          Performance Overview
        </CardTitle>
        <div className="flex items-center  gap-3">
          <Select value={selectedMetric} onValueChange={handleMetricChange}>
            <SelectTrigger
              className="font-inter font-medium rounded-[6px] [&_*[data-slot=select-value]]:text-xs [&_*[data-slot=select-value]]:lg:text-sm [&_*[data-slot=select-value]]:xl:text-[0.95rem]"
              style={{
                width: metricDropdownWidth,
                minWidth: metricDropdownWidth,
                backgroundColor: "#FFFFFF",
                color: "#2563EB",
              }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {/* Guard: Filter out empty options to prevent Radix Select error.
                  SelectItem cannot have empty string values as Select uses "" to clear selection. */}
              {metricOptions
                .filter((option) => option && String(option).trim() !== "")
                .map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedComparison}
            onValueChange={handleComparisonChange}
          >
            <SelectTrigger
              className="font-inter font-medium rounded-[6px] [&_*[data-slot=select-value]]:text-xs [&_*[data-slot=select-value]]:lg:text-sm [&_*[data-slot=select-value]]:xl:text-[0.95rem]"
              style={{
                width: comparisonDropdownWidth,
                minWidth: comparisonDropdownWidth,
                backgroundColor: "#FFFFFF",
                color: "#2563EB",
              }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {/* Guard: Filter out empty options to prevent Radix Select error.
                  SelectItem cannot have empty string values as Select uses "" to clear selection. */}
              {comparisonOptions
                .filter((option) => option && String(option).trim() !== "")
                .map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart
            data={chartData.data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="20%"
                  stopColor={metricColors.background}
                  stopOpacity={1}
                />
                <stop
                  offset="80%"
                  stopColor={metricColors.background}
                  stopOpacity={0.2}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="label"
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              interval={
                comparisonType === "Today vs Yesterday" ||
                comparisonType === "Today vs Last Week"
                  ? 3 // Show every 4th label (hourly) for 15-minute interval data
                  : comparisonType === "Current Month vs Last Month"
                    ? 2
                    : 0
              }
              tickFormatter={(value) => {
                // For hourly views, only show labels that end with :00
                if (
                  (comparisonType === "Today vs Yesterday" ||
                    comparisonType === "Today vs Last Week") &&
                  !value.endsWith(":00")
                ) {
                  return "";
                }
                return value;
              }}
            />
            <YAxis
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                padding: "8px 12px",
              }}
              formatter={(value: number, name: string) => [
                value.toLocaleString(),
                name === "current"
                  ? legendLabels.current
                  : legendLabels.previous,
              ]}
              labelFormatter={(label) => `${chartData.xAxisLabel}: ${label}`}
            />
            <Area
              type="monotone"
              dataKey="previous"
              stroke={metricColors.background}
              strokeWidth={0}
              fill={`url(#${gradientId})`}
              fillOpacity={1}
            />
            <Line
              type="monotone"
              dataKey="current"
              stroke={metricColors.icon}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-0.5"
              style={{ backgroundColor: metricColors.icon }}
            ></div>
            <span className="text-sm text-muted-foreground">
              {legendLabels.current}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 opacity-30"
              style={{ backgroundColor: metricColors.background }}
            ></div>
            <span className="text-sm text-muted-foreground">
              {legendLabels.previous}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
