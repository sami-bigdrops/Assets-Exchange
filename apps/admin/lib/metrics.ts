import { db } from "@workspace/db/db";
import { tenants, metrics } from "@workspace/db/schema";
import { eq, and, gte, lte, asc } from "drizzle-orm";

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

export interface PerformanceDataPoint {
  label: string
  todayValue: number
  yesterdayValue: number
}

export type PerformancePeriod = 
  | "today-vs-yesterday"
  | "today-vs-same-day-last-week"
  | "current-week-vs-last-week"
  | "current-month-vs-last-month"

export async function getPerformanceData(
  tenantSlug: string,
  metricType: MetricType,
  period: PerformancePeriod
): Promise<PerformanceDataPoint[]> {
  try {
    const tenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, tenantSlug))
      .limit(1)

    if (tenant.length === 0 || !tenant[0]) {
      return []
    }

    const tenantData = tenant[0]
    const now = new Date()

    switch (period) {
      case "today-vs-yesterday": {
        return getTodayVsYesterdayData(tenantData.id, metricType, now)
      }
      case "today-vs-same-day-last-week": {
        return getTodayVsSameDayLastWeekData(tenantData.id, metricType, now)
      }
      case "current-week-vs-last-week": {
        return getCurrentWeekVsLastWeekData(tenantData.id, metricType, now)
      }
      case "current-month-vs-last-month": {
        return getCurrentMonthVsLastMonthData(tenantData.id, metricType, now)
      }
      default:
        return []
    }
  } catch (error) {
    console.error("Error fetching performance data:", error)
    return []
  }
}

async function getTodayVsYesterdayData(
  tenantId: string,
  metricType: MetricType,
  now: Date
): Promise<PerformanceDataPoint[]> {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const todayEnd = new Date(today)
  todayEnd.setHours(23, 59, 59, 999)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayEnd = new Date(yesterday)
  yesterdayEnd.setHours(23, 59, 59, 999)

  const [todayMetric] = await db
    .select()
    .from(metrics)
    .where(
      and(
        eq(metrics.tenantId, tenantId),
        eq(metrics.metricType, metricType),
        gte(metrics.date, today),
        lte(metrics.date, todayEnd)
      )
    )
    .limit(1)

  const [yesterdayMetric] = await db
    .select()
    .from(metrics)
    .where(
      and(
        eq(metrics.tenantId, tenantId),
        eq(metrics.metricType, metricType),
        gte(metrics.date, yesterday),
        lte(metrics.date, yesterdayEnd)
      )
    )
    .limit(1)

  const todayValue = todayMetric?.todayValue ?? 0
  const yesterdayValue = yesterdayMetric?.yesterdayValue ?? 0

  const data: PerformanceDataPoint[] = []
  for (let hour = 0; hour < 24; hour++) {
    const hourProgress = hour / 24
    const todayHourValue = Math.round(todayValue * (0.3 + 0.7 * hourProgress))
    const yesterdayHourValue = Math.round(yesterdayValue * (0.3 + 0.7 * hourProgress))

    data.push({
      label: `${hour.toString().padStart(2, "0")}:00`,
      todayValue: todayHourValue,
      yesterdayValue: yesterdayHourValue,
    })
  }

  return data
}

async function getTodayVsSameDayLastWeekData(
  tenantId: string,
  metricType: MetricType,
  now: Date
): Promise<PerformanceDataPoint[]> {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const todayEnd = new Date(today)
  todayEnd.setHours(23, 59, 59, 999)

  const sameDayLastWeek = new Date(today)
  sameDayLastWeek.setDate(sameDayLastWeek.getDate() - 7)
  const sameDayLastWeekEnd = new Date(sameDayLastWeek)
  sameDayLastWeekEnd.setHours(23, 59, 59, 999)

  const [todayMetric] = await db
    .select()
    .from(metrics)
    .where(
      and(
        eq(metrics.tenantId, tenantId),
        eq(metrics.metricType, metricType),
        gte(metrics.date, today),
        lte(metrics.date, todayEnd)
      )
    )
    .limit(1)

  const [lastWeekMetric] = await db
    .select()
    .from(metrics)
    .where(
      and(
        eq(metrics.tenantId, tenantId),
        eq(metrics.metricType, metricType),
        gte(metrics.date, sameDayLastWeek),
        lte(metrics.date, sameDayLastWeekEnd)
      )
    )
    .limit(1)

  const todayValue = todayMetric?.todayValue ?? 0
  const lastWeekValue = lastWeekMetric?.todayValue ?? 0

  const data: PerformanceDataPoint[] = []
  for (let hour = 0; hour < 24; hour++) {
    const hourProgress = hour / 24
    const todayHourValue = Math.round(todayValue * (0.3 + 0.7 * hourProgress))
    const lastWeekHourValue = Math.round(lastWeekValue * (0.3 + 0.7 * hourProgress))

    data.push({
      label: `${hour.toString().padStart(2, "0")}:00`,
      todayValue: todayHourValue,
      yesterdayValue: lastWeekHourValue,
    })
  }

  return data
}

async function getCurrentWeekVsLastWeekData(
  tenantId: string,
  metricType: MetricType,
  now: Date
): Promise<PerformanceDataPoint[]> {
  const currentDay = now.getDay()
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const lastWeekMonday = new Date(monday)
  lastWeekMonday.setDate(monday.getDate() - 7)
  const lastWeekSunday = new Date(sunday)
  lastWeekSunday.setDate(sunday.getDate() - 7)

  const currentWeekMetrics = await db
    .select()
    .from(metrics)
    .where(
      and(
        eq(metrics.tenantId, tenantId),
        eq(metrics.metricType, metricType),
        gte(metrics.date, monday),
        lte(metrics.date, sunday)
      )
    )
    .orderBy(asc(metrics.date))

  const lastWeekMetrics = await db
    .select()
    .from(metrics)
    .where(
      and(
        eq(metrics.tenantId, tenantId),
        eq(metrics.metricType, metricType),
        gte(metrics.date, lastWeekMonday),
        lte(metrics.date, lastWeekSunday)
      )
    )
    .orderBy(asc(metrics.date))

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const data: PerformanceDataPoint[] = []

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday)
    dayDate.setDate(monday.getDate() + i)
    dayDate.setHours(0, 0, 0, 0)

    const currentWeekMetric = currentWeekMetrics.find((m) => {
      const metricDate = new Date(m.date)
      metricDate.setHours(0, 0, 0, 0)
      return metricDate.getTime() === dayDate.getTime()
    })

    const lastWeekDayDate = new Date(lastWeekMonday)
    lastWeekDayDate.setDate(lastWeekMonday.getDate() + i)
    lastWeekDayDate.setHours(0, 0, 0, 0)

    const lastWeekMetric = lastWeekMetrics.find((m) => {
      const metricDate = new Date(m.date)
      metricDate.setHours(0, 0, 0, 0)
      return metricDate.getTime() === lastWeekDayDate.getTime()
    })

    data.push({
      label: days[i] ?? "Mon",
      todayValue: currentWeekMetric?.todayValue ?? 0,
      yesterdayValue: lastWeekMetric?.todayValue ?? 0,
    })
  }

  return data
}

async function getCurrentMonthVsLastMonthData(
  tenantId: string,
  metricType: MetricType,
  now: Date
): Promise<PerformanceDataPoint[]> {
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

  const monthStart = new Date(currentYear, currentMonth, 1)
  monthStart.setHours(0, 0, 0, 0)
  const monthEnd = new Date(currentYear, currentMonth, daysInMonth)
  monthEnd.setHours(23, 59, 59, 999)

  const lastMonthStart = new Date(currentYear, currentMonth - 1, 1)
  lastMonthStart.setHours(0, 0, 0, 0)
  const lastMonthEnd = new Date(currentYear, currentMonth, 0)
  lastMonthEnd.setHours(23, 59, 59, 999)

  const currentMonthMetrics = await db
    .select()
    .from(metrics)
    .where(
      and(
        eq(metrics.tenantId, tenantId),
        eq(metrics.metricType, metricType),
        gte(metrics.date, monthStart),
        lte(metrics.date, monthEnd)
      )
    )
    .orderBy(asc(metrics.date))

  const lastMonthMetrics = await db
    .select()
    .from(metrics)
    .where(
      and(
        eq(metrics.tenantId, tenantId),
        eq(metrics.metricType, metricType),
        gte(metrics.date, lastMonthStart),
        lte(metrics.date, lastMonthEnd)
      )
    )
    .orderBy(asc(metrics.date))

  const data: PerformanceDataPoint[] = []

  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = new Date(currentYear, currentMonth, day)
    dayDate.setHours(0, 0, 0, 0)

    const currentMonthMetric = currentMonthMetrics.find((m) => {
      const metricDate = new Date(m.date)
      metricDate.setHours(0, 0, 0, 0)
      return metricDate.getTime() === dayDate.getTime()
    })

    const lastMonthDay = Math.min(day, lastMonthEnd.getDate())
    const lastMonthDayDate = new Date(currentYear, currentMonth - 1, lastMonthDay)
    lastMonthDayDate.setHours(0, 0, 0, 0)

    const lastMonthMetric = lastMonthMetrics.find((m) => {
      const metricDate = new Date(m.date)
      metricDate.setHours(0, 0, 0, 0)
      return metricDate.getTime() === lastMonthDayDate.getTime()
    })

    data.push({
      label: day.toString(),
      todayValue: currentMonthMetric?.todayValue ?? 0,
      yesterdayValue: lastMonthMetric?.todayValue ?? 0,
    })
  }

  return data
}

