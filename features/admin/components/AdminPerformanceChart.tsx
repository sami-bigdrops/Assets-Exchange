"use client";

import { useState } from "react";
import type { DateRange } from "react-day-picker";

import { PerformanceChart } from "@/features/dashboard";
import type {
  ComparisonType,
  MetricType,
} from "@/features/dashboard/types/dashboard.types";

import { usePerformanceChartViewModel } from "../view-models/usePerformanceChartViewModel";

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
  return days[today.getDay()];
};

const normalizeComparisonType = (comparison: string): ComparisonType => {
  if (comparison.startsWith("Today vs Last")) return "Today vs Last Week";
  return comparison as ComparisonType;
};

type AdminPerformanceChartProps = {
  dateRange?: DateRange;
};

export function AdminPerformanceChart({
  dateRange,
}: AdminPerformanceChartProps) {
  const [selectedComparison, setSelectedComparison] =
    useState<string>("Today vs Yesterday");
  const [selectedMetric, setSelectedMetric] =
    useState<MetricType>("Total Assets");

  const comparisonType = normalizeComparisonType(selectedComparison);

  // IMPORTANT: pass date range into the view model so it can append query params and refetch.
  const { data, isLoading, error } = usePerformanceChartViewModel(
    comparisonType,
    selectedMetric,
    dateRange
  );

  const handleComparisonChange = (comparison: ComparisonType) => {
    const lastWeekDayName = getLastWeekDayName();
    const comparisonOptions = [
      "Today vs Yesterday",
      `Today vs Last ${lastWeekDayName}`,
      "Current Week vs Last Week",
      "Current Month vs Last Month",
    ];
    const index = [
      "Today vs Yesterday",
      "Today vs Last Week",
      "Current Week vs Last Week",
      "Current Month vs Last Month",
    ].indexOf(comparison);

    if (index >= 0) setSelectedComparison(comparisonOptions[index]);
  };

  const handleMetricChange = (metric: MetricType) => {
    setSelectedMetric(metric);
  };

  return (
    <PerformanceChart
      data={data}
      isLoading={isLoading}
      error={error}
      onComparisonChange={handleComparisonChange}
      onMetricChange={handleMetricChange}
      defaultComparison={comparisonType}
      defaultMetric={selectedMetric}
    />
  );
}
