"use client";

import { useState } from "react";

import { PerformanceChart } from "@/features/dashboard";
import type { ComparisonType } from "@/features/dashboard/types/dashboard.types";

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
  const dayName = days[today.getDay()];
  return dayName;
};

const normalizeComparisonType = (comparison: string): ComparisonType => {
  if (comparison.startsWith("Today vs Last")) {
    return "Today vs Last Week";
  }
  return comparison as ComparisonType;
};

export function AdminPerformanceChart() {
  const [selectedComparison, setSelectedComparison] =
    useState<string>("Today vs Yesterday");

  const comparisonType = normalizeComparisonType(selectedComparison);

  const { data, isLoading, error } =
    usePerformanceChartViewModel(comparisonType);

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

  return (
    <PerformanceChart
      data={data}
      isLoading={isLoading}
      error={error}
      onComparisonChange={handleComparisonChange}
      defaultComparison={comparisonType}
    />
  );
}
