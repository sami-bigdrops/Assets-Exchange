import { TrendingUp, TrendingDown } from "lucide-react";
import React, { useMemo } from "react";

import { getVariables } from "@/components/_variables/variables";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import type { StatsCardProps } from "../types/dashboard.types";

/**
 * Format number in shorthand format if it exceeds 5 digits
 * Examples:
 * - 99999 -> "99,999" (no formatting, less than 5 digits)
 * - 100000 -> "100K" (100 thousand)
 * - 1000000 -> "10L" (10 lakhs = 1 million)
 * - 10000000 -> "10M" (10 million = 1 crore)
 */
function formatNumberShorthand(num: number): string {
  if (num < 100000) {
    // Less than 5 digits, return with comma formatting
    return num.toLocaleString();
  }

  if (num < 1000000) {
    // 100,000 to 999,999 - format as K (thousands)
    const thousands = num / 1000;
    return `${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)}K`;
  }

  if (num < 10000000) {
    // 1,000,000 to 9,999,999 - format as L (lakhs)
    const lakhs = num / 100000;
    return `${lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(1)}L`;
  }

  // 10,000,000 and above - format as M (millions/crores)
  const millions = num / 10000000;
  return `${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`;
}

// Helper function to parse formatted values
function parseFormattedValue(value: string): number {
  const cleanedValue = value.trim().toLowerCase();

  // Handle "k" suffix (thousands)
  if (cleanedValue.endsWith("k")) {
    const numValue = parseFloat(cleanedValue.replace(/[^0-9.]/g, ""));
    return isNaN(numValue) ? 0 : numValue * 1000;
  }
  // Handle "l" suffix (lakhs)
  if (cleanedValue.endsWith("l")) {
    const numValue = parseFloat(cleanedValue.replace(/[^0-9.]/g, ""));
    return isNaN(numValue) ? 0 : numValue * 100000;
  }
  // Handle "m" suffix (millions)
  if (cleanedValue.endsWith("m")) {
    const numValue = parseFloat(cleanedValue.replace(/[^0-9.]/g, ""));
    return isNaN(numValue) ? 0 : numValue * 10000000;
  }
  // Handle regular numbers
  const numValue = parseFloat(cleanedValue.replace(/[^0-9.]/g, ""));
  return isNaN(numValue) ? 0 : numValue;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  historicalData,
}: StatsCardProps) {
  const variables = getVariables();

  // Format the main value if it exceeds 5 digits
  const formattedValue = useMemo(() => {
    return formatNumberShorthand(value);
  }, [value]);

  // Calculate percentage change based on card type
  const calculatedTrend = useMemo(() => {
    if (!historicalData || !trend) return trend;

    // For Total Assets, compare Current Month vs Last Month
    // For all other cards, compare Today (value) vs Yesterday
    const isTotalAssets = title === "Total Assets";

    let previousValue = 0;
    let currentValue = value; // Default to the main value (represents Today)

    if (isTotalAssets) {
      // Find Current Month and Last Month from historicalData
      const currentMonthData = historicalData.find(
        (item) => item.label === "Current Month"
      );
      const lastMonthData = historicalData.find(
        (item) => item.label === "Last Month"
      );

      if (!currentMonthData || !lastMonthData) return trend;

      // Parse current month value
      if (typeof currentMonthData.value === "number") {
        currentValue = currentMonthData.value;
      } else if (typeof currentMonthData.value === "string") {
        currentValue = parseFormattedValue(currentMonthData.value);
      }

      // Parse last month value
      if (typeof lastMonthData.value === "number") {
        previousValue = lastMonthData.value;
      } else if (typeof lastMonthData.value === "string") {
        previousValue = parseFormattedValue(lastMonthData.value);
      }
    } else {
      // For other cards, compare Today vs Yesterday
      const yesterdayData = historicalData.find(
        (item) => item.label === "Yesterday"
      );

      if (!yesterdayData) return trend;

      // Parse yesterday's value
      if (typeof yesterdayData.value === "number") {
        previousValue = yesterdayData.value;
      } else if (typeof yesterdayData.value === "string") {
        previousValue = parseFormattedValue(yesterdayData.value);
      }
    }

    // Calculate percentage change
    let percentageChange = 0;
    let isPositive = true;

    if (previousValue === 0) {
      // If previous was 0, show 100% increase if current > 0, otherwise 0%
      percentageChange = currentValue > 0 ? 100 : 0;
      isPositive = currentValue > 0;
    } else {
      percentageChange = ((currentValue - previousValue) / previousValue) * 100;
      isPositive = percentageChange >= 0;
    }

    // Round to nearest integer
    const roundedPercentage = Math.round(Math.abs(percentageChange));

    return {
      ...trend,
      textValue: `${roundedPercentage}%`,
      trendIconValue: isPositive ? TrendingUp : TrendingDown,
    };
  }, [value, historicalData, trend, title]);

  const TrendIcon = calculatedTrend?.trendIconValue;
  const isPositive = TrendIcon === TrendingUp;

  // Filter and order historical data: Yesterday, Current Month, Last Month, Total
  const filteredAndOrderedHistoricalData = useMemo(() => {
    if (!historicalData) return null;

    // Define the desired order
    const order = ["Yesterday", "Current Month", "Last Month", "Total"];

    // Sort the filtered data according to the desired order
    const ordered = order
      .map((label) => historicalData.find((item) => item.label === label))
      .filter((item) => item !== undefined);

    if (ordered.length === 0) return null;

    return ordered;
  }, [historicalData]);

  const getBackgroundColor = () => {
    switch (title) {
      case "Total Assets":
        return variables.colors.totalAssetsBackgroundColor;
      case "New Requests":
        return variables.colors.newRequestsBackgroundColor;
      case "Approved Assets":
        return variables.colors.approvedAssetsBackgroundColor;
      case "Rejected Assets":
        return variables.colors.rejectedAssetsBackgroundColor;
      case "Pending Approval":
        return variables.colors.pendingApprovalBackgroundColor;
      default:
        return variables.colors.totalAssetsBackgroundColor;
    }
  };

  const getIconColor = () => {
    switch (title) {
      case "Total Assets":
        return variables.colors.totalAssetsIconColor;
      case "New Requests":
        return variables.colors.newRequestsIconColor;
      case "Approved Assets":
        return variables.colors.approvedAssetsIconColor;
      case "Rejected Assets":
        return variables.colors.rejectedAssetsIconColor;
      case "Pending Approval":
        return variables.colors.pendingApprovalIconColor;
      default:
        return variables.colors.totalAssetsIconColor;
    }
  };

  return (
    <Card className="shadow-sm gap-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle
          className="text-base font-medium font-inter"
          style={{ color: variables.colors.statsCardTitleColor }}
        >
          {title}
        </CardTitle>
        <div
          className="flex items-center justify-center rounded-md p-2"
          style={{
            backgroundColor: getBackgroundColor(),
          }}
        >
          <Icon className="h-5 w-5" style={{ color: getIconColor() }} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6 md:space-y-6.5">
        {/* Main value represents today's count */}
        <div className="flex items-center justify-between">
          <div
            className="text-4xl xl:text-[2.5rem] font-medium font-inter"
            style={{ color: variables.colors.statsCardValueColor }}
          >
            {formattedValue}
          </div>

          {calculatedTrend && (
            <div className="flex flex-col items-center justify-center gap-1">
              <span
                className="text-sm font-inter"
                style={{ color: variables.colors.statsCardTrendTextColor }}
              >
                {calculatedTrend.trendTextValue}
              </span>
              <div className="flex items-center justify-start gap-1">
                {TrendIcon && (
                  <TrendIcon
                    className="h-4.5 w-4.5"
                    style={{
                      color: isPositive
                        ? variables.colors.statsCardTrendIconColorPositive
                        : variables.colors.statsCardTrendIconColorNegative,
                    }}
                  />
                )}
                <span
                  className="text-base font-semibold font-inter"
                  style={{
                    color: isPositive
                      ? variables.colors.statsCardTrendTextColorPositive
                      : variables.colors.statsCardTrendTextColorNegative,
                  }}
                >
                  {calculatedTrend.textValue}
                </span>
              </div>
            </div>
          )}
        </div>

        {filteredAndOrderedHistoricalData && (
          <div className="space-y-2 ">
            {filteredAndOrderedHistoricalData.map((item, index) => {
              const isTotal = item.label === "Total";
              const isLastNonTotal =
                !isTotal &&
                index === filteredAndOrderedHistoricalData.length - 2;

              return (
                <React.Fragment key={index}>
                  {isTotal && <Separator />}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-inter ${isTotal ? "font-semibold" : ""}`}
                      style={{
                        color:
                          variables.colors.statsCardHistoricalDataLabelColor,
                      }}
                    >
                      {item.label}
                    </span>
                    <span
                      className={`text-base font-inter ${isTotal ? "font-semibold" : "font-medium"}`}
                      style={{
                        color:
                          variables.colors.statsCardHistoricalDataValueColor,
                      }}
                    >
                      {item.value}
                    </span>
                  </div>
                  {!isTotal && !isLastNonTotal && <Separator />}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
