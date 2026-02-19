"use client";

import { useState } from "react";

import { PerformanceChart } from "@/features/dashboard";
import type {
  ComparisonType,
  MetricType,
} from "@/features/dashboard/types/dashboard.types";

import { useAdvertiserPerformanceChartViewModel } from "../view-models/useAdvertiserPerformanceChartViewModel";

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
  if (comparison.startsWith("Today vs Last")) {
    return "Today vs Last Week";
  }
  return comparison as ComparisonType;
};

export function AdvertiserPerformanceChart() {
  const [selectedComparison, setSelectedComparison] =
    useState<string>("Today vs Yesterday");
  const [selectedMetric, setSelectedMetric] =
    useState<MetricType>("Total Assets");

  const comparisonType = normalizeComparisonType(selectedComparison);

  const { data, isLoading, error } = useAdvertiserPerformanceChartViewModel(
    comparisonType,
    selectedMetric
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
    if (index >= 0) {
      setSelectedComparison(comparisonOptions[index]);
    }
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
