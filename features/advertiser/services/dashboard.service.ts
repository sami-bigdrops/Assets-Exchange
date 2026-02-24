import { eq, and, inArray, sql } from "drizzle-orm";

import type { DashboardStats } from "@/features/admin/types/dashboard.types";
import type {
  ComparisonType,
  MetricType,
} from "@/features/dashboard/types/dashboard.types";
import { db } from "@/lib/db";
import { creativeRequests } from "@/lib/schema";

// Helper to get current date in PST as YYYY-MM-DD
function getTodayPST(): string {
  const now = new Date();
  return now.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
}

// Helper to get yesterday's date in PST as YYYY-MM-DD
function getYesterdayPST(): string {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return yesterday.toLocaleDateString("en-CA", {
    timeZone: "America/Los_Angeles",
  });
}

// Helper to get current month start in PST as YYYY-MM-DD
function getCurrentMonthStartPST(): string {
  const now = new Date();
  const pstString = now.toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
  });
  const pstDate = new Date(pstString);
  return `${pstDate.getFullYear()}-${String(pstDate.getMonth() + 1).padStart(2, "0")}-01`;
}

// Helper to get last month date range in PST
function getLastMonthRangePST(): { start: string; end: string } {
  const now = new Date();
  const pstString = now.toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
  });
  const pstDate = new Date(pstString);

  const lastMonth = new Date(pstDate.getFullYear(), pstDate.getMonth() - 1, 1);
  const lastMonthEnd = new Date(pstDate.getFullYear(), pstDate.getMonth(), 0);

  return {
    start: `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}-01`,
    end: `${lastMonthEnd.getFullYear()}-${String(lastMonthEnd.getMonth() + 1).padStart(2, "0")}-${String(lastMonthEnd.getDate()).padStart(2, "0")}`,
  };
}

export async function getDashboardStats(
  advertiserId: string
): Promise<DashboardStats> {
  const todayPST = getTodayPST();
  const yesterdayPST = getYesterdayPST();
  const currentMonthStartPST = getCurrentMonthStartPST();
  const lastMonthRange = getLastMonthRangePST();

  const baseCondition = eq(creativeRequests.advertiserId, advertiserId);

  const [
    totalAssets,
    totalAssetsToday,
    newRequests,
    approved,
    rejected,
    pending,
    newToday,
    newYesterday,
    newCurrentMonth,
    newLastMonth,
    approvedToday,
    approvedYesterday,
    approvedCurrentMonth,
    approvedLastMonth,
    rejectedToday,
    rejectedYesterday,
    rejectedCurrentMonth,
    rejectedLastMonth,
    pendingToday,
    pendingYesterday,
    pendingCurrentMonth,
    pendingLastMonth,
    totalAssetsYesterday,
    totalAssetsCurrentMonth,
    totalAssetsLastMonth,
  ] = await Promise.all([
    // Total assets (all time)
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(baseCondition),

    // Total assets today (PST)
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          baseCondition,
          sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') = ${todayPST}`
        )
      ),

    // New requests (all time, status=new, stage=admin)
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          baseCondition,
          eq(creativeRequests.status, "new"),
          eq(creativeRequests.approvalStage, "admin")
        )
      ),

    // Approved (all time)
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(and(baseCondition, eq(creativeRequests.status, "approved"))),

    // Rejected (all time)
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(and(baseCondition, eq(creativeRequests.status, "rejected"))),

    // Pending (all time)
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(baseCondition, inArray(creativeRequests.status, ["new", "pending"]))
      ),

    // New requests today (PST)
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          baseCondition,
          eq(creativeRequests.status, "new"),
          eq(creativeRequests.approvalStage, "admin"),
          sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') = ${todayPST}`
        )
      ),

    // New requests yesterday (PST)
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          baseCondition,
          eq(creativeRequests.status, "new"),
          eq(creativeRequests.approvalStage, "admin"),
          sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') = ${yesterdayPST}`
        )
      ),

    // New requests current month (PST)
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          baseCondition,
          eq(creativeRequests.status, "new"),
          eq(creativeRequests.approvalStage, "admin"),
          sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') >= ${currentMonthStartPST}`
        )
      ),

    // New requests last month (PST)
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          baseCondition,
          eq(creativeRequests.status, "new"),
          eq(creativeRequests.approvalStage, "admin"),
          sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') >= ${lastMonthRange.start}`,
          sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') <= ${lastMonthRange.end}`
        )
      ),

    // Approved today (PST) - using adminApprovedAt
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          baseCondition,
          eq(creativeRequests.status, "approved"),
          sql`DATE(${creativeRequests.adminApprovedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') = ${todayPST}`
        )
      ),

    // Approved yesterday (PST)
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          baseCondition,
          eq(creativeRequests.status, "approved"),
          sql`DATE(${creativeRequests.adminApprovedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') = ${yesterdayPST}`
        )
      ),

    // Approved current month (PST)
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          baseCondition,
          eq(creativeRequests.status, "approved"),
          sql`DATE(${creativeRequests.adminApprovedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') >= ${currentMonthStartPST}`
        )
      ),

    // Approved last month (PST)
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          baseCondition,
          eq(creativeRequests.status, "approved"),
          sql`DATE(${creativeRequests.adminApprovedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') >= ${lastMonthRange.start}`,
          sql`DATE(${creativeRequests.adminApprovedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') <= ${lastMonthRange.end}`
        )
      ),

    // Rejected today (PST)
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          baseCondition,
          eq(creativeRequests.status, "rejected"),
          sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') = ${todayPST}`
        )
      ),

    // Rejected yesterday (PST)
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          baseCondition,
          eq(creativeRequests.status, "rejected"),
          sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') = ${yesterdayPST}`
        )
      ),

    // Rejected current month (PST)
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          baseCondition,
          eq(creativeRequests.status, "rejected"),
          sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') >= ${currentMonthStartPST}`
        )
      ),

    // Rejected last month (PST)
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          baseCondition,
          eq(creativeRequests.status, "rejected"),
          sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') >= ${lastMonthRange.start}`,
          sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') <= ${lastMonthRange.end}`
        )
      ),

    // Pending today (PST)
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          baseCondition,
          inArray(creativeRequests.status, ["new", "pending"]),
          sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') = ${todayPST}`
        )
      ),

    // Pending yesterday (PST)
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          baseCondition,
          inArray(creativeRequests.status, ["new", "pending"]),
          sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') = ${yesterdayPST}`
        )
      ),

    // Pending current month (PST)
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          baseCondition,
          inArray(creativeRequests.status, ["new", "pending"]),
          sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') >= ${currentMonthStartPST}`
        )
      ),

    // Pending last month (PST)
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          baseCondition,
          inArray(creativeRequests.status, ["new", "pending"]),
          sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') >= ${lastMonthRange.start}`,
          sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') <= ${lastMonthRange.end}`
        )
      ),

    // Total assets yesterday (PST)
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          baseCondition,
          sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') = ${yesterdayPST}`
        )
      ),

    // Total assets current month (PST)
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          baseCondition,
          sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') >= ${currentMonthStartPST}`
        )
      ),

    // Total assets last month (PST)
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          baseCondition,
          sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') >= ${lastMonthRange.start}`,
          sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') <= ${lastMonthRange.end}`
        )
      ),
  ]);

  return {
    totals: {
      totalAssets: Number(totalAssets[0].count),
      newRequests: Number(newRequests[0].count),
      approved: Number(approved[0].count),
      rejected: Number(rejected[0].count),
      pending: Number(pending[0].count),
    },
    trends: {
      totalAssets: {
        today: Number(totalAssetsToday[0].count),
        yesterday: Number(totalAssetsYesterday[0].count),
      },
      newRequests: {
        today: Number(newToday[0].count),
        yesterday: Number(newYesterday[0].count),
      },
      approved: {
        today: Number(approvedToday[0].count),
        yesterday: Number(approvedYesterday[0].count),
      },
      rejected: {
        today: Number(rejectedToday[0].count),
        yesterday: Number(rejectedYesterday[0].count),
      },
      pending: {
        today: Number(pendingToday[0].count),
        yesterday: Number(pendingYesterday[0].count),
      },
    },
    historicalData: {
      totalAssets: {
        yesterday: Number(totalAssetsYesterday[0].count),
        currentMonth: Number(totalAssetsCurrentMonth[0].count),
        lastMonth: Number(totalAssetsLastMonth[0].count),
      },
      newRequests: {
        yesterday: Number(newYesterday[0].count),
        currentMonth: Number(newCurrentMonth[0].count),
        lastMonth: Number(newLastMonth[0].count),
      },
      approved: {
        yesterday: Number(approvedYesterday[0].count),
        currentMonth: Number(approvedCurrentMonth[0].count),
        lastMonth: Number(approvedLastMonth[0].count),
      },
      rejected: {
        yesterday: Number(rejectedYesterday[0].count),
        currentMonth: Number(rejectedCurrentMonth[0].count),
        lastMonth: Number(rejectedLastMonth[0].count),
      },
      pending: {
        yesterday: Number(pendingYesterday[0].count),
        currentMonth: Number(pendingCurrentMonth[0].count),
        lastMonth: Number(pendingLastMonth[0].count),
      },
    },
  };
}

// Helper to calculate getWeekNumber to be used in performance check
function getWeekNumber(d: Date): number {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export async function getDashboardPerformance(
  params: { comparisonType: ComparisonType; metric?: MetricType },
  advertiserId: string
) {
  const now = new Date();
  const { comparisonType, metric = "Total Assets" } = params;

  // Build where clause based on metric
  const getMetricWhereClause = () => {
    const baseCondition = eq(creativeRequests.advertiserId, advertiserId);

    switch (metric) {
      case "New Requests":
        return and(
          baseCondition,
          eq(creativeRequests.status, "new"),
          eq(creativeRequests.approvalStage, "admin")
        );
      case "Approved Assets":
        return and(baseCondition, eq(creativeRequests.status, "approved"));
      case "Rejected Assets":
        return and(baseCondition, eq(creativeRequests.status, "rejected"));
      case "Pending Approval":
        return and(
          baseCondition,
          inArray(creativeRequests.status, ["new", "pending"])
        );
      case "Total Assets":
      default:
        return baseCondition;
    }
  };

  const metricWhereClause = getMetricWhereClause();

  // Determine which date field to use based on metric
  const getDateField = () => {
    switch (metric) {
      case "Approved Assets":
        return creativeRequests.adminApprovedAt;
      default:
        return creativeRequests.submittedAt;
    }
  };

  const dateField = getDateField();

  let data: Array<{ label: string; current: number; previous: number }> = [];
  let xAxisLabel = "Time";

  // Use PST timezone (America/Los_Angeles handles PST/PDT automatically)
  const TZ = "America/Los_Angeles";

  // Helper to format date in PST timezone (YYYY-MM-DD)
  const formatDateInPST = (date: Date): string => {
    return date.toLocaleDateString("en-CA", { timeZone: TZ });
  };

  // Get current time in PST for date calculations
  const getNowInPST = (): Date => {
    const pstString = now.toLocaleString("en-US", { timeZone: TZ });
    return new Date(pstString);
  };

  const nowPST = getNowInPST();

  if (
    comparisonType === "Today vs Yesterday" ||
    comparisonType === "Today vs Last Week"
  ) {
    // Calculate today start in PST
    const todayStartPST = new Date(nowPST);
    todayStartPST.setHours(0, 0, 0, 0);

    // Calculate comparison date start in PST
    const comparisonStartPST = new Date(todayStartPST);
    if (comparisonType === "Today vs Yesterday") {
      comparisonStartPST.setDate(comparisonStartPST.getDate() - 1);
    } else {
      comparisonStartPST.setDate(comparisonStartPST.getDate() - 7);
    }

    // Get date keys in PST format
    const todayKey = formatDateInPST(now);
    const comparisonKey = formatDateInPST(
      new Date(
        now.getTime() -
          (comparisonType === "Today vs Yesterday"
            ? 24 * 60 * 60 * 1000
            : 7 * 24 * 60 * 60 * 1000)
      )
    );

    // Query with PST timezone conversion using 15-minute intervals
    // Use double AT TIME ZONE because submittedAt is timestamp without timezone (stored as UTC)
    // Round minutes to 15-minute intervals: FLOOR(EXTRACT(MINUTE ...) / 15) * 15
    const query = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM (${dateField} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles'))::int`,
        minute: sql<number>`(FLOOR(EXTRACT(MINUTE FROM (${dateField} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles')) / 15) * 15)::int`,
        date: sql<string>`DATE(${dateField} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles')::text`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(creativeRequests)
      .where(metricWhereClause ? and(metricWhereClause) : sql`1=1`)
      .groupBy(
        sql`DATE(${dateField} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles')`,
        sql`EXTRACT(HOUR FROM (${dateField} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles'))`,
        sql`FLOOR(EXTRACT(MINUTE FROM (${dateField} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles')) / 15) * 15`
      )
      .orderBy(
        sql`DATE(${dateField} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles')`,
        sql`EXTRACT(HOUR FROM (${dateField} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles'))`,
        sql`FLOOR(EXTRACT(MINUTE FROM (${dateField} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles')) / 15) * 15`
      );

    // Store data by date -> "HH:MM" key
    const intervalData: Record<string, Record<string, number>> = {};

    query.forEach((row) => {
      if (!intervalData[row.date]) {
        intervalData[row.date] = {};
      }
      const timeKey = `${row.hour.toString().padStart(2, "0")}:${row.minute.toString().padStart(2, "0")}`;
      intervalData[row.date][timeKey] = row.count;
    });

    // Generate all 96 intervals (24 hours * 4 intervals per hour)
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeKey = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        data.push({
          label: timeKey,
          current: intervalData[todayKey]?.[timeKey] || 0,
          previous: intervalData[comparisonKey]?.[timeKey] || 0,
        });
      }
    }

    xAxisLabel = "Time";
  } else if (comparisonType === "Current Week vs Last Week") {
    // Use PST-adjusted dates for week calculations
    const currentWeekStartPST = new Date(nowPST);
    currentWeekStartPST.setDate(
      currentWeekStartPST.getDate() - currentWeekStartPST.getDay()
    );
    currentWeekStartPST.setHours(0, 0, 0, 0);

    const currentWeek = getWeekNumber(nowPST);
    const lastWeek = currentWeek - 1;
    const currentYear = nowPST.getFullYear();

    // Query with PST timezone (double AT TIME ZONE for timestamp without timezone)
    const query = await db
      .select({
        dayOfWeek: sql<number>`EXTRACT(DOW FROM (${dateField} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles'))::int`,
        week: sql<number>`EXTRACT(WEEK FROM (${dateField} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles'))::int`,
        year: sql<number>`EXTRACT(YEAR FROM (${dateField} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles'))::int`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(creativeRequests)
      .where(metricWhereClause ? and(metricWhereClause) : sql`1=1`)
      .groupBy(
        sql`EXTRACT(YEAR FROM (${dateField} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles'))`,
        sql`EXTRACT(WEEK FROM (${dateField} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles'))`,
        sql`EXTRACT(DOW FROM (${dateField} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles'))`
      )
      .orderBy(
        sql`EXTRACT(YEAR FROM (${dateField} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles'))`,
        sql`EXTRACT(WEEK FROM (${dateField} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles'))`,
        sql`EXTRACT(DOW FROM (${dateField} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles'))`
      );

    const weeklyData: Record<number, Record<number, number>> = {};

    query.forEach((row) => {
      const weekKey = row.year === currentYear ? currentWeek : lastWeek;
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {};
      }
      weeklyData[weekKey][row.dayOfWeek] = row.count;
    });

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    data = days.map((day, index) => ({
      label: day,
      current: weeklyData[currentWeek]?.[index] || 0,
      previous: weeklyData[lastWeek]?.[index] || 0,
    }));

    xAxisLabel = "Day of Week";
  } else if (comparisonType === "Current Month vs Last Month") {
    // Query with PST timezone (double AT TIME ZONE for timestamp without timezone)
    const query = await db
      .select({
        dayOfMonth: sql<number>`EXTRACT(DAY FROM (${dateField} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles'))::int`,
        month: sql<number>`EXTRACT(MONTH FROM (${dateField} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles'))::int`,
        year: sql<number>`EXTRACT(YEAR FROM (${dateField} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles'))::int`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(creativeRequests)
      .where(metricWhereClause ? and(metricWhereClause) : sql`1=1`)
      .groupBy(
        sql`EXTRACT(YEAR FROM (${dateField} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles'))`,
        sql`EXTRACT(MONTH FROM (${dateField} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles'))`,
        sql`EXTRACT(DAY FROM (${dateField} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles'))`
      )
      .orderBy(
        sql`EXTRACT(YEAR FROM (${dateField} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles'))`,
        sql`EXTRACT(MONTH FROM (${dateField} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles'))`,
        sql`EXTRACT(DAY FROM (${dateField} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles'))`
      );

    const currentYear = nowPST.getFullYear();
    const currentMonth = nowPST.getMonth() + 1; // 1-12
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const monthlyData: Record<
      number,
      Record<number, Record<number, number>>
    > = {};

    query.forEach((row) => {
      if (!monthlyData[row.year]) monthlyData[row.year] = {};
      if (!monthlyData[row.year][row.month])
        monthlyData[row.year][row.month] = {};
      monthlyData[row.year][row.month][row.dayOfMonth] = row.count;
    });

    const daysInCurrentMonth = new Date(currentYear, currentMonth, 0).getDate();
    const daysInLastMonth = new Date(lastMonthYear, lastMonth, 0).getDate();
    const maxDays = Math.max(daysInCurrentMonth, daysInLastMonth);

    for (let day = 1; day <= maxDays; day++) {
      data.push({
        label: `Day ${day}`,
        current: monthlyData[currentYear]?.[currentMonth]?.[day] || 0,
        previous: monthlyData[lastMonthYear]?.[lastMonth]?.[day] || 0,
      });
    }

    xAxisLabel = "Day of Month";
  }

  return {
    comparisonType,
    xAxisLabel,
    data,
  };
}
