/**
 * TODO: BACKEND - Remove Mock Performance Chart Data
 *
 * This file contains MOCK DATA for performance charts (development/testing only).
 *
 * Action Items:
 * 1. Remove this entire file once backend APIs are integrated
 * 2. All chart data should come from database aggregations
 * 3. Update imports in performance-chart.service.ts to remove references to this file
 * 4. Ensure no production code depends on this mock data
 *
 * Note: Keep this file during development for frontend testing
 *
 * Backend should provide:
 * - Time-series data aggregated by hour/day/month
 * - Comparison data for current vs previous periods
 * - Proper data point counts (24 hours, 7 days, 31 days)
 * - Fill missing data points with zeros
 */

import type {
  ComparisonType,
  PerformanceChartData,
} from "@/features/dashboard/types/dashboard.types";

const generate24HourData = (): PerformanceChartData => {
  const data = [];
  for (let hour = 0; hour < 24; hour++) {
    const timeLabel = `${hour.toString().padStart(2, "0")}:00`;
    data.push({
      label: timeLabel,
      current: Math.floor(Math.random() * 20000) + 1000,
      previous: Math.floor(Math.random() * 20000) + 1000,
    });
  }
  return {
    data,
    comparisonType: "Today vs Yesterday",
    xAxisLabel: "Time",
  };
};

const generateWeeklyData = (): PerformanceChartData => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const data = days.map((day) => ({
    label: day,
    current: Math.floor(Math.random() * 20000) + 1000,
    previous: Math.floor(Math.random() * 20000) + 1000,
  }));
  return {
    data,
    comparisonType: "Current Week vs Last Week",
    xAxisLabel: "Day",
  };
};

const generateMonthlyData = (): PerformanceChartData => {
  const data = [];
  const daysInMonth = 31;
  for (let day = 1; day <= daysInMonth; day++) {
    data.push({
      label: day.toString().padStart(2, "0"),
      current: Math.floor(Math.random() * 20000) + 1000,
      previous: Math.floor(Math.random() * 20000) + 1000,
    });
  }
  return {
    data,
    comparisonType: "Current Month vs Last Month",
    xAxisLabel: "Date",
  };
};

export const getPerformanceChartDataByType = (
  comparisonType: ComparisonType
): PerformanceChartData => {
  switch (comparisonType) {
    case "Today vs Yesterday":
    case "Today vs Last Week":
      return generate24HourData();
    case "Current Week vs Last Week":
      return generateWeeklyData();
    case "Current Month vs Last Month":
      return generateMonthlyData();
    default:
      return generate24HourData();
  }
};
