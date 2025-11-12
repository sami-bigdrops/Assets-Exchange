import { db } from "@workspace/db/db";
import { tenants, metrics } from "@workspace/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export type MetricType = 
  | "totalAssets" 
  | "newRequests" 
  | "approvedAssets" 
  | "rejectedAssets" 
  | "pendingApproval";

export interface MetricData {
  metricType: MetricType;
  todayValue: number;
  yesterdayValue: number;
  currentMonthValue: number;
  lastMonthValue: number;
}

export interface CalculatedMetricData extends MetricData {
  todayPercentage: string;
  trend: "up" | "down";
}

function calculatePercentage(current: number, previous: number): { percentage: string; trend: "up" | "down" } {
  if (previous === 0) {
    return { percentage: current > 0 ? "100%" : "0%", trend: current > 0 ? "up" : "down" };
  }
  
  const change = ((current - previous) / previous) * 100;
  const trend = change >= 0 ? "up" : "down";
  const percentage = `${Math.abs(Math.round(change))}%`;
  
  return { percentage, trend };
}

export async function getMetricsByTenantSlug(
  tenantSlug: string
): Promise<CalculatedMetricData[]> {
  try {
    const tenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, tenantSlug))
      .limit(1);

    if (tenant.length === 0) {
      return [];
    }

    const tenantData = tenant[0];
    if (!tenantData) {
      return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = new Date(today);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    
    const metricsData = await db
      .select()
      .from(metrics)
      .where(
        and(
          eq(metrics.tenantId, tenantData.id),
          gte(metrics.date, todayStart),
          lte(metrics.date, todayEnd)
        )
      );

    const metricTypes: MetricType[] = [
      "totalAssets",
      "newRequests",
      "approvedAssets",
      "rejectedAssets",
      "pendingApproval",
    ];

    const result: CalculatedMetricData[] = [];

    for (const metricType of metricTypes) {
      const metric = metricsData.find((m) => m.metricType === metricType);

      if (metric) {
        const { percentage, trend } = calculatePercentage(
          metric.todayValue,
          metric.yesterdayValue
        );

        result.push({
          metricType,
          todayValue: metric.todayValue,
          yesterdayValue: metric.yesterdayValue,
          currentMonthValue: metric.currentMonthValue,
          lastMonthValue: metric.lastMonthValue,
          todayPercentage: percentage,
          trend,
        });
      } else {
        result.push({
          metricType,
          todayValue: 0,
          yesterdayValue: 0,
          currentMonthValue: 0,
          lastMonthValue: 0,
          todayPercentage: "0%",
          trend: "down",
        });
      }
    }

    return result;
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return [];
  }
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
}

export function formatMetricValue(value: number): string {
  return formatNumber(value);
}

