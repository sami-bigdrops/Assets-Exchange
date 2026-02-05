import { eq, and, inArray, sql, gte, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import { creativeRequests } from "@/lib/schema";

import type { DashboardStats } from "../types/dashboard.types";

export async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = new Date(todayStart);
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

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
    db.select({ count: sql<number>`count(*)` }).from(creativeRequests),
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(gte(creativeRequests.submittedAt, todayStart)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          eq(creativeRequests.status, "new"),
          eq(creativeRequests.approvalStage, "admin")
        )
      ),

    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(eq(creativeRequests.status, "approved")),

    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(eq(creativeRequests.status, "rejected")),

    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(inArray(creativeRequests.status, ["new", "pending"])),

    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          eq(creativeRequests.status, "new"),
          eq(creativeRequests.approvalStage, "admin"),
          gte(creativeRequests.submittedAt, todayStart)
        )
      ),

    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          eq(creativeRequests.status, "new"),
          eq(creativeRequests.approvalStage, "admin"),
          gte(creativeRequests.submittedAt, yesterdayStart),
          lte(creativeRequests.submittedAt, yesterdayEnd)
        )
      ),

    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          eq(creativeRequests.status, "new"),
          eq(creativeRequests.approvalStage, "admin"),
          gte(creativeRequests.submittedAt, currentMonthStart)
        )
      ),

    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          eq(creativeRequests.status, "new"),
          eq(creativeRequests.approvalStage, "admin"),
          gte(creativeRequests.submittedAt, lastMonthStart),
          lte(creativeRequests.submittedAt, lastMonthEnd)
        )
      ),

    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          eq(creativeRequests.status, "approved"),
          gte(creativeRequests.adminApprovedAt, todayStart)
        )
      ),

    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          eq(creativeRequests.status, "approved"),
          gte(creativeRequests.adminApprovedAt, yesterdayStart),
          lte(creativeRequests.adminApprovedAt, yesterdayEnd)
        )
      ),

    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          eq(creativeRequests.status, "approved"),
          gte(creativeRequests.adminApprovedAt, currentMonthStart)
        )
      ),

    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          eq(creativeRequests.status, "approved"),
          gte(creativeRequests.adminApprovedAt, lastMonthStart),
          lte(creativeRequests.adminApprovedAt, lastMonthEnd)
        )
      ),

    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          eq(creativeRequests.status, "rejected"),
          gte(creativeRequests.submittedAt, todayStart)
        )
      ),

    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          eq(creativeRequests.status, "rejected"),
          gte(creativeRequests.submittedAt, yesterdayStart),
          lte(creativeRequests.submittedAt, yesterdayEnd)
        )
      ),

    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          eq(creativeRequests.status, "rejected"),
          gte(creativeRequests.submittedAt, currentMonthStart)
        )
      ),

    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          eq(creativeRequests.status, "rejected"),
          gte(creativeRequests.submittedAt, lastMonthStart),
          lte(creativeRequests.submittedAt, lastMonthEnd)
        )
      ),

    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          inArray(creativeRequests.status, ["new", "pending"]),
          gte(creativeRequests.submittedAt, todayStart)
        )
      ),

    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          inArray(creativeRequests.status, ["new", "pending"]),
          gte(creativeRequests.submittedAt, yesterdayStart),
          lte(creativeRequests.submittedAt, yesterdayEnd)
        )
      ),

    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          inArray(creativeRequests.status, ["new", "pending"]),
          gte(creativeRequests.submittedAt, currentMonthStart)
        )
      ),

    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          inArray(creativeRequests.status, ["new", "pending"]),
          gte(creativeRequests.submittedAt, lastMonthStart),
          lte(creativeRequests.submittedAt, lastMonthEnd)
        )
      ),

    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          gte(creativeRequests.submittedAt, yesterdayStart),
          lte(creativeRequests.submittedAt, yesterdayEnd)
        )
      ),

    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(gte(creativeRequests.submittedAt, currentMonthStart)),

    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(
        and(
          gte(creativeRequests.submittedAt, lastMonthStart),
          lte(creativeRequests.submittedAt, lastMonthEnd)
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
