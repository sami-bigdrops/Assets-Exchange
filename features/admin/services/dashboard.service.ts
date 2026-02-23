import { eq, and, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { creativeRequests } from "@/lib/schema";

import type { DashboardStats } from "../types/dashboard.types";

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

/**
 * ANALYTICS BUSINESS RULES - See lib/analytics/creative-requests-rules.ts
 *
 * Approved Status: status = 'approved' (do NOT check approvalStage - it's redundant)
 * Time to Approval: admin_approved_at - submitted_at (only for status = 'approved' AND admin_approved_at IS NOT NULL)
 */

export async function getDashboardStats(): Promise<DashboardStats> {
  const todayPST = getTodayPST();
  const yesterdayPST = getYesterdayPST();
  const currentMonthStartPST = getCurrentMonthStartPST();
  const lastMonthRange = getLastMonthRangePST();

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
    db.select({ count: sql<number>`count(*)` }).from(creativeRequests),

    // Total assets today (PST)
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') = ${todayPST}`
      ),

    // New requests (all time, status=new, stage=admin)
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          eq(creativeRequests.status, "new"),
          eq(creativeRequests.approvalStage, "admin")
        )
      ),

    // Approved (all time)
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(eq(creativeRequests.status, "approved")),

    // Rejected (all time)
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(eq(creativeRequests.status, "rejected")),

    // Pending (all time)
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(inArray(creativeRequests.status, ["new", "pending"])),

    // New requests today (PST)
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
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
        sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') = ${yesterdayPST}`
      ),

    // Total assets current month (PST)
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') >= ${currentMonthStartPST}`
      ),

    // Total assets last month (PST)
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
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
