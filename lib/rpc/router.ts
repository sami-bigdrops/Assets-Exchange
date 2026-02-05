import { os } from "@orpc/server";
import { eq, and, sql, inArray, or, like, desc, asc, count } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { creativeRequests, creativeRequestHistory, offers } from "@/lib/schema";
import { getEverflowService } from "@/lib/services/everflow.service";

import { requireRpcAdmin } from "./auth";

export const health = os
  .output(
    z.object({
      status: z.string(),
      timestamp: z.string(),
    })
  )
  .handler(async () => {
    logger.rpc.info("Health check requested");
    const response = {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
    logger.rpc.success(
      `Health check completed - status: ${response.status}, timestamp: ${response.timestamp}`
    );
    return response;
  });

const currentUser = os
  .output(
    z
      .object({
        id: z.string(),
        email: z.string(),
        name: z.string().nullable(),
        role: z.enum(["admin", "advertiser", "administrator"]),
      })
      .nullable()
  )
  .handler(async () => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session?.user) {
        return null;
      }

      return {
        id: session.user.id,
        email: session.user.email ?? "",
        name: session.user.name,
        role: session.user.role as "admin" | "advertiser" | "administrator",
      };
    } catch (error) {
      logger.rpc.error(
        `Failed to get current user: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  });

const currentRole = os
  .output(z.enum(["admin", "advertiser", "administrator"]).nullable())
  .handler(async () => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session?.user?.role) {
        return null;
      }

      return session.user.role as "admin" | "advertiser" | "administrator";
    } catch (error) {
      logger.rpc.error(
        `Failed to get current role: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  });

const checkPermission = os
  .input(
    z.object({
      resource: z.string(),
      action: z.string(),
    })
  )
  .output(z.boolean())
  .handler(async ({ input }) => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session?.user) {
        return false;
      }

      const role = session.user.role as
        | "admin"
        | "advertiser"
        | "administrator";

      const ROLE_PERMISSIONS: Record<string, Record<string, string[]>> = {
        admin: {
          requests: ["read", "write", "approve", "reject"],
          responses: ["read", "write", "reject"],
          offers: ["read", "write", "create", "delete"],
          advertisers: ["read", "write", "create", "delete"],
          publishers: ["read", "write", "create", "delete"],
        },
        advertiser: {
          requests: ["read"],
          responses: ["read", "write", "approve", "reject"],
          offers: ["read"],
        },
        administrator: {
          requests: ["read", "write", "approve", "reject"],
          responses: ["read", "write", "reject"],
          offers: ["read", "write", "create", "delete"],
          advertisers: ["read", "write", "create", "delete"],
          publishers: ["read", "write", "create", "delete"],
        },
      };

      const permissions = ROLE_PERMISSIONS[role];
      if (!permissions) {
        return false;
      }

      const resourcePermissions = permissions[input.resource];
      if (!resourcePermissions) {
        return false;
      }

      return resourcePermissions.includes(input.action);
    } catch (error) {
      logger.rpc.error(
        `Failed to check permission: ${error instanceof Error ? error.message : String(error)}, input: ${JSON.stringify(input)}`
      );
      return false;
    }
  });

export const authRouter = {
  currentUser,
  currentRole,
  checkPermission,
};

const dashboardStats = os
  .output(
    z.object({
      stats: z.array(
        z.object({
          title: z.string(),
          value: z.number(),
          trend: z.object({
            trendTextValue: z.string(),
            textValue: z.string(),
            trendIconValue: z.enum(["trending-up", "trending-down"]),
          }),
          historicalData: z.array(
            z.object({
              label: z.string(),
              value: z.string(),
            })
          ),
        })
      ),
      timestamp: z.string(),
    })
  )
  .handler(async () => {
    try {
      await requireRpcAdmin();

      // PST timezone helpers
      const now = new Date();
      const getTodayPST = (): string => {
        return now.toLocaleDateString("en-CA", {
          timeZone: "America/Los_Angeles",
        });
      };
      const getYesterdayPST = (): string => {
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        return yesterday.toLocaleDateString("en-CA", {
          timeZone: "America/Los_Angeles",
        });
      };
      const getCurrentMonthStartPST = (): string => {
        const pstString = now.toLocaleString("en-US", {
          timeZone: "America/Los_Angeles",
        });
        const pstDate = new Date(pstString);
        return `${pstDate.getFullYear()}-${String(pstDate.getMonth() + 1).padStart(2, "0")}-01`;
      };
      const getLastMonthRangePST = (): { start: string; end: string } => {
        const pstString = now.toLocaleString("en-US", {
          timeZone: "America/Los_Angeles",
        });
        const pstDate = new Date(pstString);
        const lastMonth = new Date(
          pstDate.getFullYear(),
          pstDate.getMonth() - 1,
          1
        );
        const lastMonthEnd = new Date(
          pstDate.getFullYear(),
          pstDate.getMonth(),
          0
        );
        return {
          start: `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}-01`,
          end: `${lastMonthEnd.getFullYear()}-${String(lastMonthEnd.getMonth() + 1).padStart(2, "0")}-${String(lastMonthEnd.getDate()).padStart(2, "0")}`,
        };
      };

      const todayPST = getTodayPST();
      const yesterdayPST = getYesterdayPST();
      const currentMonthStartPST = getCurrentMonthStartPST();
      const lastMonthRange = getLastMonthRangePST();

      // Total Assets queries with PST timezone (double AT TIME ZONE for timestamp without timezone)
      const totalAssetsToday = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(creativeRequests)
        .where(
          sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') = ${todayPST}`
        );

      const totalAssetsYesterday = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(creativeRequests)
        .where(
          sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') = ${yesterdayPST}`
        );

      const totalAssetsCurrentMonth = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(creativeRequests)
        .where(
          sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') >= ${currentMonthStartPST}`
        );

      const totalAssetsLastMonth = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(creativeRequests)
        .where(
          and(
            sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') >= ${lastMonthRange.start}`,
            sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') <= ${lastMonthRange.end}`
          )
        );

      // New Requests queries with PST timezone
      const newRequestsToday = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(creativeRequests)
        .where(
          and(
            eq(creativeRequests.status, "new"),
            eq(creativeRequests.approvalStage, "admin"),
            sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') = ${todayPST}`
          )
        );

      const newRequestsYesterday = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(creativeRequests)
        .where(
          and(
            eq(creativeRequests.status, "new"),
            eq(creativeRequests.approvalStage, "admin"),
            sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') = ${yesterdayPST}`
          )
        );

      const newRequestsCurrentMonth = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(creativeRequests)
        .where(
          and(
            eq(creativeRequests.status, "new"),
            eq(creativeRequests.approvalStage, "admin"),
            sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') >= ${currentMonthStartPST}`
          )
        );

      const newRequestsLastMonth = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(creativeRequests)
        .where(
          and(
            eq(creativeRequests.status, "new"),
            eq(creativeRequests.approvalStage, "admin"),
            sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') >= ${lastMonthRange.start}`,
            sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') <= ${lastMonthRange.end}`
          )
        );

      // Approved queries with PST timezone (using adminApprovedAt)
      const approvedToday = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(creativeRequests)
        .where(
          and(
            eq(creativeRequests.status, "approved"),
            sql`DATE(${creativeRequests.adminApprovedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') = ${todayPST}`
          )
        );

      const approvedYesterday = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(creativeRequests)
        .where(
          and(
            eq(creativeRequests.status, "approved"),
            sql`DATE(${creativeRequests.adminApprovedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') = ${yesterdayPST}`
          )
        );

      const approvedCurrentMonth = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(creativeRequests)
        .where(
          and(
            eq(creativeRequests.status, "approved"),
            sql`DATE(${creativeRequests.adminApprovedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') >= ${currentMonthStartPST}`
          )
        );

      const approvedLastMonth = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(creativeRequests)
        .where(
          and(
            eq(creativeRequests.status, "approved"),
            sql`DATE(${creativeRequests.adminApprovedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') >= ${lastMonthRange.start}`,
            sql`DATE(${creativeRequests.adminApprovedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') <= ${lastMonthRange.end}`
          )
        );

      // Rejected queries with PST timezone
      const rejectedToday = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(creativeRequests)
        .where(
          and(
            eq(creativeRequests.status, "rejected"),
            sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') = ${todayPST}`
          )
        );

      const rejectedYesterday = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(creativeRequests)
        .where(
          and(
            eq(creativeRequests.status, "rejected"),
            sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') = ${yesterdayPST}`
          )
        );

      const rejectedCurrentMonth = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(creativeRequests)
        .where(
          and(
            eq(creativeRequests.status, "rejected"),
            sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') >= ${currentMonthStartPST}`
          )
        );

      const rejectedLastMonth = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(creativeRequests)
        .where(
          and(
            eq(creativeRequests.status, "rejected"),
            sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') >= ${lastMonthRange.start}`,
            sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') <= ${lastMonthRange.end}`
          )
        );

      // Pending queries with PST timezone
      const pendingToday = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(creativeRequests)
        .where(
          and(
            inArray(creativeRequests.status, ["new", "pending"]),
            sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') = ${todayPST}`
          )
        );

      const pendingYesterday = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(creativeRequests)
        .where(
          and(
            inArray(creativeRequests.status, ["new", "pending"]),
            sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') = ${yesterdayPST}`
          )
        );

      const pendingCurrentMonth = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(creativeRequests)
        .where(
          and(
            inArray(creativeRequests.status, ["new", "pending"]),
            sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') >= ${currentMonthStartPST}`
          )
        );

      const pendingLastMonth = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(creativeRequests)
        .where(
          and(
            inArray(creativeRequests.status, ["new", "pending"]),
            sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') >= ${lastMonthRange.start}`,
            sql`DATE(${creativeRequests.submittedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') <= ${lastMonthRange.end}`
          )
        );

      const calculateTrend = (today: number, yesterday: number) => {
        if (yesterday === 0) {
          return {
            trendTextValue: "Today",
            textValue: today > 0 ? "100%" : "0%",
            trendIconValue:
              today > 0 ? ("trending-up" as const) : ("trending-down" as const),
          };
        }
        const change = ((today - yesterday) / yesterday) * 100;
        return {
          trendTextValue: "Today",
          textValue: `${Math.abs(Math.round(change))}%`,
          trendIconValue:
            change >= 0 ? ("trending-up" as const) : ("trending-down" as const),
        };
      };

      const formatNumber = (num: number): string => {
        if (num >= 1000) {
          return `${(num / 1000).toFixed(1)}k`;
        }
        return num.toString();
      };

      const stats = [
        {
          title: "Total Assets",
          value: totalAssetsToday[0]?.count ?? 0,
          trend: calculateTrend(
            totalAssetsToday[0]?.count ?? 0,
            totalAssetsYesterday[0]?.count ?? 0
          ),
          historicalData: [
            {
              label: "Yesterday",
              value: formatNumber(totalAssetsYesterday[0]?.count ?? 0),
            },
            {
              label: "Current Month",
              value: formatNumber(totalAssetsCurrentMonth[0]?.count ?? 0),
            },
            {
              label: "Last Month",
              value: formatNumber(totalAssetsLastMonth[0]?.count ?? 0),
            },
          ],
        },
        {
          title: "New Requests",
          value: newRequestsToday[0]?.count ?? 0,
          trend: calculateTrend(
            newRequestsToday[0]?.count ?? 0,
            newRequestsYesterday[0]?.count ?? 0
          ),
          historicalData: [
            {
              label: "Yesterday",
              value: formatNumber(newRequestsYesterday[0]?.count ?? 0),
            },
            {
              label: "Current Month",
              value: formatNumber(newRequestsCurrentMonth[0]?.count ?? 0),
            },
            {
              label: "Last Month",
              value: formatNumber(newRequestsLastMonth[0]?.count ?? 0),
            },
          ],
        },
        {
          title: "Approved Assets",
          value: approvedToday[0]?.count ?? 0,
          trend: calculateTrend(
            approvedToday[0]?.count ?? 0,
            approvedYesterday[0]?.count ?? 0
          ),
          historicalData: [
            {
              label: "Yesterday",
              value: formatNumber(approvedYesterday[0]?.count ?? 0),
            },
            {
              label: "Current Month",
              value: formatNumber(approvedCurrentMonth[0]?.count ?? 0),
            },
            {
              label: "Last Month",
              value: formatNumber(approvedLastMonth[0]?.count ?? 0),
            },
          ],
        },
        {
          title: "Rejected Assets",
          value: rejectedToday[0]?.count ?? 0,
          trend: calculateTrend(
            rejectedToday[0]?.count ?? 0,
            rejectedYesterday[0]?.count ?? 0
          ),
          historicalData: [
            {
              label: "Yesterday",
              value: formatNumber(rejectedYesterday[0]?.count ?? 0),
            },
            {
              label: "Current Month",
              value: formatNumber(rejectedCurrentMonth[0]?.count ?? 0),
            },
            {
              label: "Last Month",
              value: formatNumber(rejectedLastMonth[0]?.count ?? 0),
            },
          ],
        },
        {
          title: "Pending Approval",
          value: pendingToday[0]?.count ?? 0,
          trend: calculateTrend(
            pendingToday[0]?.count ?? 0,
            pendingYesterday[0]?.count ?? 0
          ),
          historicalData: [
            {
              label: "Yesterday",
              value: formatNumber(pendingYesterday[0]?.count ?? 0),
            },
            {
              label: "Current Month",
              value: formatNumber(pendingCurrentMonth[0]?.count ?? 0),
            },
            {
              label: "Last Month",
              value: formatNumber(pendingLastMonth[0]?.count ?? 0),
            },
          ],
        },
      ];

      return {
        stats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.rpc.error(
        `Failed to get dashboard stats: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  });

const dashboardPerformance = os
  .input(
    z.object({
      comparisonType: z.enum([
        "Today vs Yesterday",
        "Today vs Last Week",
        "Current Week vs Last Week",
        "Current Month vs Last Month",
      ]),
      metric: z
        .enum([
          "Total Assets",
          "New Requests",
          "Approved Assets",
          "Rejected Assets",
          "Pending Approval",
        ])
        .optional()
        .default("Total Assets"),
    })
  )
  .output(
    z.object({
      comparisonType: z.string(),
      xAxisLabel: z.string(),
      data: z.array(
        z.object({
          label: z.string(),
          current: z.number(),
          previous: z.number(),
        })
      ),
      timestamp: z.string(),
    })
  )
  .handler(async ({ input }) => {
    try {
      await requireRpcAdmin();
      const now = new Date();
      const { comparisonType, metric = "Total Assets" } = input;

      // Build where clause based on metric
      const getMetricWhereClause = () => {
        switch (metric) {
          case "New Requests":
            return and(
              eq(creativeRequests.status, "new"),
              eq(creativeRequests.approvalStage, "admin")
            );
          case "Approved Assets":
            return eq(creativeRequests.status, "approved");
          case "Rejected Assets":
            return eq(creativeRequests.status, "rejected");
          case "Pending Approval":
            return inArray(creativeRequests.status, ["new", "pending"]);
          case "Total Assets":
          default:
            return undefined; // No filter for total assets
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

      let data: Array<{ label: string; current: number; previous: number }> =
        [];
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

        // Query with PST timezone conversion using raw SQL for timezone literal
        // Use double AT TIME ZONE because submittedAt is timestamp without timezone (stored as UTC)
        const query = await db
          .select({
            hour: sql<number>`EXTRACT(HOUR FROM (${dateField} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles'))::int`,
            date: sql<string>`DATE(${dateField} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles')::text`,
            count: sql<number>`COUNT(*)::int`,
          })
          .from(creativeRequests)
          .where(metricWhereClause ? and(metricWhereClause) : sql`1=1`)
          .groupBy(
            sql`DATE(${dateField} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles')`,
            sql`EXTRACT(HOUR FROM (${dateField} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles'))`
          )
          .orderBy(
            sql`DATE(${dateField} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles')`,
            sql`EXTRACT(HOUR FROM (${dateField} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles'))`
          );

        const hourlyData: Record<string, Record<number, number>> = {};

        query.forEach((row) => {
          if (!hourlyData[row.date]) {
            hourlyData[row.date] = {};
          }
          hourlyData[row.date][row.hour] = row.count;
        });

        for (let hour = 0; hour < 24; hour++) {
          data.push({
            label: hour.toString().padStart(2, "0") + ":00",
            current: hourlyData[todayKey]?.[hour] || 0,
            previous: hourlyData[comparisonKey]?.[hour] || 0,
          });
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

        xAxisLabel = "Day";
      } else if (comparisonType === "Current Month vs Last Month") {
        // Use PST-adjusted dates for month calculations
        const currentMonthKey = `${nowPST.getFullYear()}-${nowPST.getMonth() + 1}`;
        const lastMonthPST = new Date(nowPST);
        lastMonthPST.setMonth(lastMonthPST.getMonth() - 1);
        const lastMonthKey = `${lastMonthPST.getFullYear()}-${lastMonthPST.getMonth() + 1}`;

        const daysInCurrentMonth = new Date(
          nowPST.getFullYear(),
          nowPST.getMonth() + 1,
          0
        ).getDate();

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

        const monthlyData: Record<string, Record<number, number>> = {};

        query.forEach((row) => {
          const monthKey = `${row.year}-${row.month}`;
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {};
          }
          monthlyData[monthKey][row.dayOfMonth] = row.count;
        });

        for (let day = 1; day <= daysInCurrentMonth; day++) {
          data.push({
            label: day.toString().padStart(2, "0"),
            current: monthlyData[currentMonthKey]?.[day] || 0,
            previous: monthlyData[lastMonthKey]?.[day] || 0,
          });
        }

        xAxisLabel = "Date";
      }

      logger.rpc.success(
        `Dashboard performance data fetched - comparisonType: ${comparisonType}, dataPoints: ${data.length}`
      );

      return {
        comparisonType,
        xAxisLabel,
        data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.rpc.error(
        `Failed to get dashboard performance: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  });

function getWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

const getAllRequests = os
  .input(
    z.object({
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(20),
      status: z
        .array(z.enum(["new", "pending", "approved", "rejected", "sent-back"]))
        .optional(),
      approvalStage: z
        .array(z.enum(["admin", "advertiser", "completed"]))
        .optional(),
      priority: z
        .array(z.enum(["High Priority", "Medium Priority"]))
        .optional(),
      search: z.string().optional(),
      sortBy: z.enum(["date", "priority", "advertiserName"]).default("date"),
      sortOrder: z.enum(["asc", "desc"]).default("desc"),
    })
  )
  .output(
    z.object({
      data: z.array(z.any()),
      pagination: z.object({
        total: z.number(),
        page: z.number(),
        limit: z.number(),
        totalPages: z.number(),
      }),
    })
  )
  .handler(async ({ input }) => {
    try {
      await requireRpcAdmin();
      const {
        page,
        limit,
        status,
        approvalStage,
        priority,
        search,
        sortBy,
        sortOrder,
      } = input;
      const offset = (page - 1) * limit;

      const conditions = [];

      if (status && status.length > 0) {
        conditions.push(inArray(creativeRequests.status, status));
      }

      if (approvalStage && approvalStage.length > 0) {
        conditions.push(inArray(creativeRequests.approvalStage, approvalStage));
      }

      if (priority && priority.length > 0) {
        conditions.push(inArray(creativeRequests.priority, priority));
      }

      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        conditions.push(
          or(
            like(creativeRequests.advertiserName, searchTerm),
            like(creativeRequests.offerName, searchTerm),
            like(creativeRequests.clientName, searchTerm),
            like(creativeRequests.offerId, searchTerm)
          )!
        );
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const totalResult = await db
        .select({ count: count() })
        .from(creativeRequests)
        .where(whereClause);

      const total = totalResult[0]?.count ?? 0;

      let orderByClause;
      if (sortBy === "date") {
        orderByClause =
          sortOrder === "desc"
            ? desc(creativeRequests.submittedAt)
            : asc(creativeRequests.submittedAt);
      } else if (sortBy === "priority") {
        orderByClause =
          sortOrder === "desc"
            ? desc(creativeRequests.priority)
            : asc(creativeRequests.priority);
      } else {
        orderByClause =
          sortOrder === "desc"
            ? desc(creativeRequests.advertiserName)
            : asc(creativeRequests.advertiserName);
      }

      const data = await db
        .select()
        .from(creativeRequests)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      return {
        data,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.rpc.error(
        `Failed to get all requests: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  });

const getRecentRequests = os
  .input(
    z.object({
      limit: z.number().int().min(1).max(50).default(3),
    })
  )
  .output(z.array(z.any()))
  .handler(async ({ input }) => {
    try {
      await requireRpcAdmin();
      const { limit } = input;

      const data = await db
        .select()
        .from(creativeRequests)
        .orderBy(desc(creativeRequests.submittedAt))
        .limit(limit);

      return data;
    } catch (error) {
      logger.rpc.error(
        `Failed to get recent requests: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  });

const getRequestById = os
  .input(
    z.object({
      id: z.string(),
    })
  )
  .output(z.any().nullable())
  .handler(async ({ input }) => {
    try {
      await requireRpcAdmin();
      const { id } = input;

      const [request] = await db
        .select()
        .from(creativeRequests)
        .where(eq(creativeRequests.id, id))
        .limit(1);

      if (!request) {
        return null;
      }

      const history = await db
        .select()
        .from(creativeRequestHistory)
        .where(eq(creativeRequestHistory.requestId, id))
        .orderBy(desc(creativeRequestHistory.actionAt));

      return {
        ...request,
        history,
      };
    } catch (error) {
      logger.rpc.error(
        `Failed to get request by ID ${input.id}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  });

const getAllResponses = os
  .input(
    z.object({
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(20),
      status: z
        .array(z.enum(["new", "pending", "approved", "rejected", "sent-back"]))
        .optional(),
      approvalStage: z
        .array(z.enum(["admin", "advertiser", "completed"]))
        .optional(),
      priority: z
        .array(z.enum(["High Priority", "Medium Priority"]))
        .optional(),
      search: z.string().optional(),
      sortBy: z.enum(["date", "priority", "advertiserName"]).default("date"),
      sortOrder: z.enum(["asc", "desc"]).default("desc"),
    })
  )
  .output(
    z.object({
      data: z.array(z.any()),
      pagination: z.object({
        total: z.number(),
        page: z.number(),
        limit: z.number(),
        totalPages: z.number(),
      }),
    })
  )
  .handler(async ({ input }) => {
    try {
      await requireRpcAdmin();
      const {
        page,
        limit,
        status,
        approvalStage,
        priority,
        search,
        sortBy,
        sortOrder,
      } = input;
      const offset = (page - 1) * limit;

      const conditions = [];

      conditions.push(
        and(
          eq(creativeRequests.approvalStage, "advertiser"),
          sql`${creativeRequests.status} != 'sent-back'`
        )!
      );

      if (status && status.length > 0) {
        conditions.push(inArray(creativeRequests.status, status));
      }

      if (approvalStage && approvalStage.length > 0) {
        conditions.push(inArray(creativeRequests.approvalStage, approvalStage));
      }

      if (priority && priority.length > 0) {
        conditions.push(inArray(creativeRequests.priority, priority));
      }

      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        conditions.push(
          or(
            like(creativeRequests.advertiserName, searchTerm),
            like(creativeRequests.offerName, searchTerm),
            like(creativeRequests.clientName, searchTerm),
            like(creativeRequests.offerId, searchTerm)
          )!
        );
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const totalResult = await db
        .select({ count: count() })
        .from(creativeRequests)
        .where(whereClause);

      const total = totalResult[0]?.count ?? 0;

      let orderByClause;
      if (sortBy === "date") {
        orderByClause =
          sortOrder === "desc"
            ? desc(creativeRequests.submittedAt)
            : asc(creativeRequests.submittedAt);
      } else if (sortBy === "priority") {
        orderByClause =
          sortOrder === "desc"
            ? desc(creativeRequests.priority)
            : asc(creativeRequests.priority);
      } else {
        orderByClause =
          sortOrder === "desc"
            ? desc(creativeRequests.advertiserName)
            : asc(creativeRequests.advertiserName);
      }

      const data = await db
        .select()
        .from(creativeRequests)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      return {
        data,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.rpc.error(
        `Failed to get all responses: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  });

const getRecentResponses = os
  .input(
    z.object({
      limit: z.number().int().min(1).max(50).default(3),
    })
  )
  .output(z.array(z.any()))
  .handler(async ({ input }) => {
    try {
      await requireRpcAdmin();
      const { limit } = input;

      const data = await db
        .select()
        .from(creativeRequests)
        .where(
          and(
            eq(creativeRequests.approvalStage, "advertiser"),
            sql`${creativeRequests.status} != 'sent-back'`
          )!
        )
        .orderBy(desc(creativeRequests.submittedAt))
        .limit(limit);

      return data;
    } catch (error) {
      logger.rpc.error(
        `Failed to get recent responses: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  });

const getResponseById = os
  .input(
    z.object({
      id: z.string(),
    })
  )
  .output(z.any().nullable())
  .handler(async ({ input }) => {
    try {
      await requireRpcAdmin();
      const { id } = input;

      const [response] = await db
        .select()
        .from(creativeRequests)
        .where(eq(creativeRequests.id, id))
        .limit(1);

      if (!response) {
        return null;
      }

      const history = await db
        .select()
        .from(creativeRequestHistory)
        .where(eq(creativeRequestHistory.requestId, id))
        .orderBy(desc(creativeRequestHistory.actionAt));

      return {
        ...response,
        history,
      };
    } catch (error) {
      logger.rpc.error(
        `Failed to get response by ID ${input.id}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  });

const approveAndForward = os
  .input(
    z.object({
      id: z.string(),
      comments: z.string().optional(),
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      data: z.any(),
      message: z.string(),
    })
  )
  .handler(async ({ input }) => {
    try {
      const session = await requireRpcAdmin();

      const { id, comments } = input;
      const actionBy = session.user.id;
      const actionRole =
        session.user.role === "admin" ? "admin" : "administrator";

      const [request] = await db
        .select()
        .from(creativeRequests)
        .where(
          and(
            eq(creativeRequests.id, id),
            eq(creativeRequests.status, "new"),
            eq(creativeRequests.approvalStage, "admin")
          )
        )
        .limit(1);

      if (!request) {
        throw new Error("Request not found or invalid state for approval");
      }

      const now = new Date();

      await db.transaction(async (tx) => {
        await tx
          .update(creativeRequests)
          .set({
            status: "pending",
            approvalStage: "advertiser",
            adminStatus: "approved",
            adminApprovedBy: actionBy,
            adminApprovedAt: now,
            adminComments: comments || null,
            updatedAt: now,
          })
          .where(eq(creativeRequests.id, id));

        await tx.insert(creativeRequestHistory).values({
          requestId: id,
          actionType: "admin_approved",
          oldStatus: request.status,
          newStatus: "pending",
          oldApprovalStage: request.approvalStage,
          newApprovalStage: "advertiser",
          actionBy,
          actionRole,
          comments: comments || null,
          actionAt: now,
        });
      });

      const [updatedRequest] = await db
        .select()
        .from(creativeRequests)
        .where(eq(creativeRequests.id, id))
        .limit(1);

      logger.rpc.success(
        `Request approved and forwarded - requestId: ${id}, actionBy: ${actionBy}`
      );

      return {
        success: true,
        data: {
          request: updatedRequest,
        },
        message: "Request approved and forwarded to advertiser",
      };
    } catch (error) {
      logger.rpc.error(
        `Failed to approve and forward request ${input.id}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  });

const rejectAndSendBack = os
  .input(
    z.object({
      id: z.string(),
      comments: z.string().min(1, "Comments are required for rejection"),
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      data: z.any(),
      message: z.string(),
    })
  )
  .handler(async ({ input }) => {
    try {
      const session = await requireRpcAdmin();

      const { id, comments } = input;
      const actionBy = session.user.id;
      const actionRole =
        session.user.role === "admin" ? "admin" : "administrator";

      const [request] = await db
        .select()
        .from(creativeRequests)
        .where(
          and(
            eq(creativeRequests.id, id),
            eq(creativeRequests.status, "new"),
            eq(creativeRequests.approvalStage, "admin")
          )
        )
        .limit(1);

      if (!request) {
        throw new Error("Request not found or invalid state for rejection");
      }

      const now = new Date();

      await db.transaction(async (tx) => {
        await tx
          .update(creativeRequests)
          .set({
            status: "rejected",
            adminStatus: "rejected",
            adminApprovedBy: actionBy,
            adminApprovedAt: now,
            adminComments: comments,
            updatedAt: now,
          })
          .where(eq(creativeRequests.id, id));

        await tx.insert(creativeRequestHistory).values({
          requestId: id,
          actionType: "admin_rejected",
          oldStatus: request.status,
          newStatus: "rejected",
          oldApprovalStage: request.approvalStage,
          newApprovalStage: request.approvalStage,
          actionBy,
          actionRole,
          comments,
          actionAt: now,
        });
      });

      const [updatedRequest] = await db
        .select()
        .from(creativeRequests)
        .where(eq(creativeRequests.id, id))
        .limit(1);

      logger.rpc.success(
        `Request rejected - requestId: ${id}, actionBy: ${actionBy}`
      );

      return {
        success: true,
        data: {
          request: updatedRequest,
        },
        message: "Request rejected and sent back to publisher",
      };
    } catch (error) {
      logger.rpc.error(
        `Failed to reject request ${input.id}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  });

const rejectResponseAndSendBack = os
  .input(
    z.object({
      id: z.string(),
      comments: z.string().min(1, "Comments are required for sending back"),
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      data: z.any(),
      message: z.string(),
    })
  )
  .handler(async ({ input }) => {
    try {
      const session = await requireRpcAdmin();

      const { id, comments } = input;
      const actionBy = session.user.id;
      const actionRole =
        session.user.role === "admin" ? "admin" : "administrator";

      const [request] = await db
        .select()
        .from(creativeRequests)
        .where(
          and(
            eq(creativeRequests.id, id),
            inArray(creativeRequests.status, ["pending", "sent-back"]),
            eq(creativeRequests.approvalStage, "advertiser")
          )
        )
        .limit(1);

      if (!request) {
        throw new Error("Response not found or invalid state for sending back");
      }

      const now = new Date();

      await db.transaction(async (tx) => {
        await tx
          .update(creativeRequests)
          .set({
            status: "sent-back",
            advertiserStatus: "sent_back",
            advertiserRespondedBy: actionBy,
            advertiserRespondedAt: now,
            advertiserComments: comments,
            updatedAt: now,
          })
          .where(eq(creativeRequests.id, id));

        await tx.insert(creativeRequestHistory).values({
          requestId: id,
          actionType: "advertiser_sent_back",
          oldStatus: request.status,
          newStatus: "sent-back",
          oldApprovalStage: request.approvalStage,
          newApprovalStage: request.approvalStage,
          actionBy,
          actionRole,
          comments,
          actionAt: now,
        });
      });

      const [updatedRequest] = await db
        .select()
        .from(creativeRequests)
        .where(eq(creativeRequests.id, id))
        .limit(1);

      logger.rpc.success(
        `Response sent back - requestId: ${id}, actionBy: ${actionBy}`
      );

      return {
        success: true,
        data: {
          request: updatedRequest,
        },
        message: "Response sent back to advertiser",
      };
    } catch (error) {
      logger.rpc.error(
        `Failed to send back response ${input.id}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  });

const getAllOffers = os
  .input(
    z.object({
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(20),
      status: z.array(z.enum(["Active", "Inactive"])).optional(),
      visibility: z.array(z.enum(["Public", "Internal", "Hidden"])).optional(),
      createdMethod: z.array(z.enum(["Manually", "API"])).optional(),
      search: z.string().optional(),
      sortBy: z
        .enum(["id", "offerName", "advertiserName", "status", "createdAt"])
        .default("createdAt"),
      sortOrder: z.enum(["asc", "desc"]).default("desc"),
    })
  )
  .output(
    z.object({
      data: z.array(z.any()),
      pagination: z.object({
        total: z.number(),
        page: z.number(),
        limit: z.number(),
        totalPages: z.number(),
      }),
    })
  )
  .handler(async ({ input }) => {
    try {
      await requireRpcAdmin();
      const {
        page,
        limit,
        status,
        visibility,
        createdMethod,
        search,
        sortBy,
        sortOrder,
      } = input;
      const offset = (page - 1) * limit;

      const conditions = [];

      if (status && status.length > 0) {
        conditions.push(inArray(offers.status, status));
      }

      if (visibility && visibility.length > 0) {
        conditions.push(inArray(offers.visibility, visibility));
      }

      if (createdMethod && createdMethod.length > 0) {
        conditions.push(inArray(offers.createdMethod, createdMethod));
      }

      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        conditions.push(
          or(
            like(offers.offerName, searchTerm),
            like(offers.advertiserName, searchTerm),
            like(offers.id, searchTerm)
          )!
        );
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const totalResult = await db
        .select({ count: count() })
        .from(offers)
        .where(whereClause);

      const total = totalResult[0]?.count ?? 0;

      let orderByClause;
      if (sortBy === "id") {
        orderByClause = sortOrder === "desc" ? desc(offers.id) : asc(offers.id);
      } else if (sortBy === "offerName") {
        orderByClause =
          sortOrder === "desc" ? desc(offers.offerName) : asc(offers.offerName);
      } else if (sortBy === "advertiserName") {
        orderByClause =
          sortOrder === "desc"
            ? desc(offers.advertiserName)
            : asc(offers.advertiserName);
      } else if (sortBy === "status") {
        orderByClause =
          sortOrder === "desc" ? desc(offers.status) : asc(offers.status);
      } else {
        // Use created_at from schema (snake_case)
        orderByClause =
          sortOrder === "desc" ? desc(offers.createdAt) : asc(offers.createdAt);
      }

      const data = await db
        .select()
        .from(offers)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      return {
        data,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.rpc.error(
        `Failed to get all offers: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  });

const getOfferById = os
  .input(
    z.object({
      id: z.string(),
    })
  )
  .output(z.any().nullable())
  .handler(async ({ input }) => {
    try {
      await requireRpcAdmin();
      const { id } = input;
      const [offer] = await db
        .select()
        .from(offers)
        .where(eq(offers.id, id))
        .limit(1);

      if (!offer) {
        return null;
      }

      return offer;
    } catch (error) {
      logger.rpc.error(
        `Failed to get offer by ID ${input.id}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  });

const createOffer = os
  .input(
    z.object({
      offerName: z.string().min(1),
      advertiserId: z.string().min(1),
      advertiserName: z.string().min(1),
      createdMethod: z.enum(["Manually", "API"]).default("Manually"),
      status: z.enum(["Active", "Inactive"]).default("Active"),
      visibility: z.enum(["Public", "Internal", "Hidden"]).default("Public"),
      brandGuidelines: z
        .object({
          type: z.enum(["url", "file", "text"]).nullable(),
          url: z.string().optional(),
          fileUrl: z.string().optional(),
          fileName: z.string().optional(),
          fileSize: z.number().optional(),
          mimeType: z.string().optional(),
          text: z.string().optional(),
          notes: z.string().optional(),
        })
        .optional(),
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      data: z.any(),
      message: z.string(),
    })
  )
  .handler(async ({ input }) => {
    try {
      const session = await requireRpcAdmin();
      const { brandGuidelines, ...offerData } = input;

      const [newOffer] = await db
        .insert(offers)
        .values({
          ...offerData,
          brandGuidelines: brandGuidelines || null,
          createdBy: session.user.id,
          updatedBy: session.user.id,
        })
        .returning();

      logger.rpc.success(`Offer created - id: ${newOffer.id}`);
      return {
        success: true,
        data: newOffer,
        message: "Offer created successfully",
      };
    } catch (error) {
      logger.rpc.error(
        `Failed to create offer: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  });

const updateOffer = os
  .input(
    z.object({
      id: z.string(),
      offerName: z.string().min(1).optional(),
      advertiserId: z.string().min(1).optional(),
      advertiserName: z.string().min(1).optional(),
      status: z.enum(["Active", "Inactive"]).optional(),
      visibility: z.enum(["Public", "Internal", "Hidden"]).optional(),
      brandGuidelines: z
        .object({
          type: z.enum(["url", "file", "text"]).nullable(),
          url: z.string().optional(),
          fileUrl: z.string().optional(),
          fileName: z.string().optional(),
          fileSize: z.number().optional(),
          mimeType: z.string().optional(),
          text: z.string().optional(),
          notes: z.string().optional(),
        })
        .optional(),
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      data: z.any(),
      message: z.string(),
    })
  )
  .handler(async ({ input }) => {
    try {
      const session = await requireRpcAdmin();
      const { id, brandGuidelines, ...updateData } = input;

      const [existingOffer] = await db
        .select()
        .from(offers)
        .where(eq(offers.id, id))
        .limit(1);

      if (!existingOffer) {
        throw new Error("Offer not found");
      }

      const updateValues: Record<string, unknown> = {
        ...updateData,
        updatedBy: session.user.id,
        updatedAt: new Date(),
      };

      if (brandGuidelines !== undefined) {
        updateValues.brandGuidelines = brandGuidelines;
      }

      const [updatedOffer] = await db
        .update(offers)
        .set(updateValues)
        .where(eq(offers.id, id))
        .returning();

      logger.rpc.success(`Offer updated - id: ${id}`);
      return {
        success: true,
        data: updatedOffer,
        message: "Offer updated successfully",
      };
    } catch (error) {
      logger.rpc.error(
        `Failed to update offer ${input.id}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  });

const deleteOffer = os
  .input(
    z.object({
      id: z.string(),
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      message: z.string(),
    })
  )
  .handler(async ({ input }) => {
    try {
      await requireRpcAdmin();
      const { id } = input;

      const [existingOffer] = await db
        .select()
        .from(offers)
        .where(eq(offers.id, id))
        .limit(1);

      if (!existingOffer) {
        throw new Error("Offer not found");
      }

      const [dependentRequests] = await db
        .select({ count: count() })
        .from(creativeRequests)
        .where(eq(creativeRequests.offerId, id));

      if (dependentRequests.count > 0) {
        throw new Error(
          `Cannot delete offer: ${dependentRequests.count} creative request(s) are using this offer`
        );
      }

      await db.delete(offers).where(eq(offers.id, id));

      logger.rpc.success(`Offer deleted - id: ${id}`);
      return {
        success: true,
        message: "Offer deleted successfully",
      };
    } catch (error) {
      logger.rpc.error(
        `Failed to delete offer ${input.id}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  });

const updateOfferStatus = os
  .input(
    z.object({
      id: z.string(),
      status: z.enum(["Active", "Inactive"]),
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      data: z.any(),
      message: z.string(),
    })
  )
  .handler(async ({ input }) => {
    try {
      const session = await requireRpcAdmin();
      const { id, status } = input;

      const [updatedOffer] = await db
        .update(offers)
        .set({
          status,
          updatedBy: session.user.id,
          updatedAt: new Date(),
        })
        .where(eq(offers.id, id))
        .returning();

      if (!updatedOffer) {
        throw new Error("Offer not found");
      }

      logger.rpc.success(`Offer status updated - id: ${id}, status: ${status}`);
      return {
        success: true,
        data: updatedOffer,
        message: "Offer status updated successfully",
      };
    } catch (error) {
      logger.rpc.error(
        `Failed to update offer status ${input.id}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  });

const updateOfferVisibility = os
  .input(
    z.object({
      id: z.string(),
      visibility: z.enum(["Public", "Internal", "Hidden"]),
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      data: z.any(),
      message: z.string(),
    })
  )
  .handler(async ({ input }) => {
    try {
      const session = await requireRpcAdmin();
      const { id, visibility } = input;

      const [updatedOffer] = await db
        .update(offers)
        .set({
          visibility,
          updatedBy: session.user.id,
          updatedAt: new Date(),
        })
        .where(eq(offers.id, id))
        .returning();

      if (!updatedOffer) {
        throw new Error("Offer not found");
      }

      logger.rpc.success(
        `Offer visibility updated - id: ${id}, visibility: ${visibility}`
      );
      return {
        success: true,
        data: updatedOffer,
        message: "Offer visibility updated successfully",
      };
    } catch (error) {
      logger.rpc.error(
        `Failed to update offer visibility ${input.id}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  });

const bulkUpdateOffers = os
  .input(
    z.object({
      offerIds: z.array(z.string()).min(1, "At least one offer ID is required"),
      updates: z.object({
        visibility: z.enum(["Public", "Internal", "Hidden"]).optional(),
        brandGuidelines: z
          .object({
            type: z.enum(["url", "file", "text"]).nullable(),
            url: z.string().optional(),
            fileUrl: z.string().optional(),
            fileName: z.string().optional(),
            fileSize: z.number().optional(),
            mimeType: z.string().optional(),
            text: z.string().optional(),
            notes: z.string().optional(),
          })
          .optional(),
      }),
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      updated: z.number(),
      failed: z.number(),
      results: z.object({
        successful: z.array(z.string()),
        failed: z.array(
          z.object({
            offerId: z.string(),
            error: z.string(),
            reason: z.string(),
          })
        ),
      }),
      message: z.string(),
    })
  )
  .handler(async ({ input }) => {
    try {
      const session = await requireRpcAdmin();
      const { offerIds, updates } = input;

      if (offerIds.length === 0) {
        throw new Error("At least one offer ID is required");
      }

      const successful: string[] = [];
      const failed: Array<{ offerId: string; error: string; reason: string }> =
        [];

      const updateValues: Record<string, unknown> = {
        updatedBy: session.user.id,
        updatedAt: new Date(),
      };

      if (updates.visibility !== undefined) {
        updateValues.visibility = updates.visibility;
      }

      if (updates.brandGuidelines !== undefined) {
        updateValues.brandGuidelines = updates.brandGuidelines;
      }

      for (const offerId of offerIds) {
        try {
          const [existingOffer] = await db
            .select()
            .from(offers)
            .where(eq(offers.id, offerId))
            .limit(1);

          if (!existingOffer) {
            failed.push({
              offerId,
              error: "Offer not found",
              reason: `The offer with ID ${offerId} does not exist`,
            });
            continue;
          }

          await db
            .update(offers)
            .set(updateValues)
            .where(eq(offers.id, offerId));

          successful.push(offerId);
        } catch (error) {
          failed.push({
            offerId,
            error: error instanceof Error ? error.message : "Unknown error",
            reason:
              error instanceof Error ? error.message : "Unknown error occurred",
          });
        }
      }

      const updated = successful.length;
      const failedCount = failed.length;

      logger.rpc.success(
        `Bulk update completed - total: ${offerIds.length}, updated: ${updated}, failed: ${failedCount}`
      );

      return {
        success: failedCount === 0,
        updated,
        failed: failedCount,
        results: {
          successful,
          failed,
        },
        message:
          failedCount === 0
            ? `Successfully updated ${updated} offer(s)`
            : `Updated ${updated} offer(s), ${failedCount} failed`,
      };
    } catch (error) {
      logger.rpc.error(
        `Failed to bulk update offers: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  });

export const adminRouter = {
  dashboard: {
    stats: dashboardStats,
    performance: dashboardPerformance,
  },
  requests: {
    getAll: getAllRequests,
    getRecent: getRecentRequests,
    getById: getRequestById,
    approveAndForward,
    rejectAndSendBack,
  },
  responses: {
    getAll: getAllResponses,
    getRecent: getRecentResponses,
    getById: getResponseById,
    rejectAndSendBack: rejectResponseAndSendBack,
  },
  offers: {
    getAll: getAllOffers,
    getById: getOfferById,
    create: createOffer,
    update: updateOffer,
    delete: deleteOffer,
    updateStatus: updateOfferStatus,
    updateVisibility: updateOfferVisibility,
    bulkUpdate: bulkUpdateOffers,
  },
  everflow: {
    getConfig: os
      .output(
        z.object({
          apiKey: z.string().optional(),
          baseUrl: z.string(),
          region: z.string().optional(),
          networkId: z.string().optional(),
          configured: z.boolean(),
        })
      )
      .handler(async () => {
        const session = await requireRpcAdmin();
        const service = getEverflowService();
        const config = service.getConfig();

        logger.everflow.info(
          `Everflow config retrieved - userId: ${session.user.id}`
        );

        return {
          apiKey: config.apiKey ? "***" : undefined,
          baseUrl: config.baseUrl,
          region: config.region,
          networkId: config.networkId,
          configured: !!config.apiKey,
        };
      }),

    updateConfig: os
      .input(
        z.object({
          apiKey: z.string().min(1).optional(),
          baseUrl: z.string().url().optional(),
          region: z.enum(["api.eflow.team", "api-eu.eflow.team"]).optional(),
          networkId: z.string().optional(),
        })
      )
      .output(
        z.object({
          success: z.boolean(),
          message: z.string(),
          configured: z.boolean(),
        })
      )
      .handler(async ({ input }) => {
        const session = await requireRpcAdmin();
        const service = getEverflowService();

        const configUpdate: {
          apiKey?: string;
          baseUrl?: string;
          region?: string;
          networkId?: string;
        } = {};

        if (input.apiKey) {
          configUpdate.apiKey = input.apiKey;
        }
        if (input.baseUrl) {
          configUpdate.baseUrl = input.baseUrl;
        }
        if (input.region) {
          configUpdate.region = input.region;
          if (!input.baseUrl) {
            configUpdate.baseUrl = `https://${input.region}/v1`;
          }
        }
        if (input.networkId !== undefined) {
          configUpdate.networkId = input.networkId;
        }

        service.updateConfig(configUpdate);

        if (input.apiKey) {
          const connectionTest = await service.testConnection();
          if (!connectionTest) {
            logger.everflow.warn(
              `Everflow connection test failed after config update - userId: ${session.user.id}`
            );
            return {
              success: false,
              message:
                "Configuration updated but connection test failed. Please verify your API credentials.",
              configured: true,
            };
          }
        }

        logger.everflow.success(
          `Everflow config updated - userId: ${session.user.id}`
        );

        return {
          success: true,
          message: "Configuration updated successfully",
          configured: true,
        };
      }),

    testConnection: os
      .output(
        z.object({
          success: z.boolean(),
          message: z.string(),
          error: z.string().optional(),
          details: z.record(z.string(), z.unknown()).optional(),
        })
      )
      .handler(async () => {
        const session = await requireRpcAdmin();
        const service = getEverflowService();
        const config = service.getConfig();

        logger.everflow.info(
          `Testing Everflow connection - userId: ${session.user.id}, baseUrl: ${config.baseUrl}, hasApiKey: ${!!config.apiKey}, hasNetworkId: ${!!config.networkId}`
        );

        if (!config.apiKey) {
          return {
            success: false,
            message:
              "API key not configured. Please set EVERFLOW_API_KEY in your environment variables.",
            error: "API key missing",
          };
        }

        try {
          const isConnected = await service.testConnection();

          if (isConnected) {
            logger.everflow.success(
              `Everflow connection test passed - userId: ${session.user.id}`
            );
            return {
              success: true,
              message: "Connection successful",
            };
          } else {
            logger.everflow.error(
              `Everflow connection test failed - userId: ${session.user.id}`
            );
            return {
              success: false,
              message:
                "Connection failed. Please check your API credentials and endpoint.",
              error: "Connection test returned false",
              details: {
                baseUrl: config.baseUrl,
                hasApiKey: !!config.apiKey,
                hasNetworkId: !!config.networkId,
              },
            };
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger.everflow.error(
            `Everflow connection test error - userId: ${session.user.id}, error: ${errorMessage}, baseUrl: ${config.baseUrl}`
          );
          return {
            success: false,
            message: `Connection failed: ${errorMessage}`,
            error: errorMessage,
            details: {
              baseUrl: config.baseUrl,
              hasApiKey: !!config.apiKey,
              hasNetworkId: !!config.networkId,
            },
          };
        }
      }),

    syncOffers: os
      .input(
        z.object({
          conflictResolution: z
            .enum(["skip", "update", "merge"])
            .optional()
            .default("update"),
          filters: z
            .object({
              status: z.string().optional(),
              advertiserId: z.string().optional(),
              limit: z.number().int().positive().max(1000).optional(),
            })
            .optional(),
          dryRun: z.boolean().optional().default(false),
        })
      )
      .output(
        z.object({
          success: z.boolean(),
          syncId: z.string(),
          status: z.enum(["completed", "failed"]),
          totalRecords: z.number(),
          syncedRecords: z.number(),
          createdRecords: z.number(),
          updatedRecords: z.number(),
          skippedRecords: z.number(),
          failedRecords: z.number(),
          errors: z.array(
            z.object({
              offerId: z.number(),
              error: z.string(),
            })
          ),
          message: z.string(),
        })
      )
      .handler(async ({ input }) => {
        const session = await requireRpcAdmin();
        const { syncOffersFromEverflow } =
          await import("@/lib/services/everflow-sync.service");

        logger.everflow.info(
          `Starting offers sync - userId: ${session.user.id}, options: ${JSON.stringify(input)}`
        );

        try {
          const result = await syncOffersFromEverflow(session.user.id, {
            conflictResolution: input.conflictResolution,
            filters: input.filters,
            dryRun: input.dryRun,
          });

          return {
            success: result.status === "completed",
            syncId: result.syncId,
            status: result.status,
            totalRecords: result.totalRecords,
            syncedRecords: result.syncedRecords,
            createdRecords: result.createdRecords,
            updatedRecords: result.updatedRecords,
            skippedRecords: result.skippedRecords,
            failedRecords: result.failedRecords,
            errors: result.errors,
            message:
              result.status === "completed"
                ? `Sync completed: ${result.syncedRecords} offers synced (${result.createdRecords} created, ${result.updatedRecords} updated, ${result.skippedRecords} skipped)`
                : `Sync failed: ${result.errors[0]?.error || "Unknown error"}`,
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger.everflow.error(
            `Offers sync error - userId: ${session.user.id}, error: ${errorMessage}`
          );

          return {
            success: false,
            syncId: "",
            status: "failed",
            totalRecords: 0,
            syncedRecords: 0,
            createdRecords: 0,
            updatedRecords: 0,
            skippedRecords: 0,
            failedRecords: 0,
            errors: [{ offerId: 0, error: errorMessage }],
            message: `Sync failed: ${errorMessage}`,
          };
        }
      }),

    syncAdvertisers: os
      .input(
        z.object({
          conflictResolution: z
            .enum(["skip", "update", "merge"])
            .optional()
            .default("update"),
          filters: z
            .object({
              status: z.string().optional(),
              limit: z.number().int().positive().max(1000).optional(),
            })
            .optional(),
          dryRun: z.boolean().optional().default(false),
        })
      )
      .output(
        z.object({
          success: z.boolean(),
          syncId: z.string(),
          status: z.enum(["completed", "failed"]),
          totalRecords: z.number(),
          syncedRecords: z.number(),
          createdRecords: z.number(),
          updatedRecords: z.number(),
          skippedRecords: z.number(),
          failedRecords: z.number(),
          errors: z.array(
            z.object({
              advertiserId: z.number(),
              error: z.string(),
            })
          ),
          message: z.string(),
        })
      )
      .handler(async ({ input }) => {
        const session = await requireRpcAdmin();
        const { syncAdvertisersFromEverflow } =
          await import("@/lib/services/everflow-sync.service");

        logger.everflow.info(
          `Starting advertisers sync - userId: ${session.user.id}, options: ${JSON.stringify(input)}`
        );

        try {
          const result = await syncAdvertisersFromEverflow(session.user.id, {
            conflictResolution: input.conflictResolution,
            filters: input.filters,
            dryRun: input.dryRun,
          });

          return {
            success: result.status === "completed",
            syncId: result.syncId,
            status: result.status,
            totalRecords: result.totalRecords,
            syncedRecords: result.syncedRecords,
            createdRecords: result.createdRecords,
            updatedRecords: result.updatedRecords,
            skippedRecords: result.skippedRecords,
            failedRecords: result.failedRecords,
            errors: result.errors,
            message:
              result.status === "completed"
                ? `Sync completed: ${result.syncedRecords} advertisers synced (${result.createdRecords} created, ${result.updatedRecords} updated, ${result.skippedRecords} skipped)`
                : `Sync failed: ${result.errors[0]?.error || "Unknown error"}`,
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger.everflow.error(
            `Advertisers sync error - userId: ${session.user.id}, error: ${errorMessage}`
          );

          return {
            success: false,
            syncId: "",
            status: "failed",
            totalRecords: 0,
            syncedRecords: 0,
            createdRecords: 0,
            updatedRecords: 0,
            skippedRecords: 0,
            failedRecords: 0,
            errors: [{ advertiserId: 0, error: errorMessage }],
            message: `Sync failed: ${errorMessage}`,
          };
        }
      }),

    getSyncHistory: os
      .input(
        z.object({
          syncType: z.enum(["offers", "advertisers"]).optional(),
          limit: z.number().int().positive().max(100).optional().default(50),
        })
      )
      .output(
        z.array(
          z.object({
            id: z.string(),
            syncType: z.string(),
            status: z.string(),
            startedBy: z.string(),
            totalRecords: z.number().nullable(),
            syncedRecords: z.number().nullable(),
            updatedRecords: z.number().nullable(),
            createdRecords: z.number().nullable(),
            failedRecords: z.number().nullable(),
            skippedRecords: z.number().nullable(),
            errorMessage: z.string().nullable(),
            syncOptions: z.record(z.string(), z.unknown()).nullable(),
            startedAt: z.date(),
            completedAt: z.date().nullable(),
          })
        )
      )
      .handler(async ({ input }) => {
        await requireRpcAdmin();
        const { getSyncHistory } =
          await import("@/lib/services/everflow-sync.service");

        return getSyncHistory(input.syncType, input.limit);
      }),

    clearDummyData: os
      .output(
        z.object({
          success: z.boolean(),
          message: z.string(),
          deletedOffers: z.number(),
          deletedCreativeRequests: z.number(),
        })
      )
      .handler(async () => {
        const session = await requireRpcAdmin();

        logger.rpc.info(`Clearing dummy data - userId: ${session.user.id}`);

        try {
          // Get counts before deletion
          const [offersCount] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(offers);

          const [requestsCount] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(creativeRequests);

          const initialOffersCount = offersCount.count;
          const initialRequestsCount = requestsCount.count;

          // Delete creative requests first (to avoid foreign key issues)
          await db.delete(creativeRequests);

          // Delete all offers
          await db.delete(offers);

          // Verify deletion
          const [_finalOffersCount] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(offers);

          const [_finalRequestsCount] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(creativeRequests);

          logger.rpc.success(
            `Dummy data cleared - userId: ${session.user.id}, deletedOffers: ${initialOffersCount}, deletedCreativeRequests: ${initialRequestsCount}`
          );

          return {
            success: true,
            message: `Successfully deleted ${initialOffersCount} offers and ${initialRequestsCount} creative requests`,
            deletedOffers: initialOffersCount,
            deletedCreativeRequests: initialRequestsCount,
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger.rpc.error(
            `Error clearing dummy data - userId: ${session.user.id}, error: ${errorMessage}`
          );

          return {
            success: false,
            message: `Failed to clear dummy data: ${errorMessage}`,
            deletedOffers: 0,
            deletedCreativeRequests: 0,
          };
        }
      }),
  },
};

export const router = {
  health,
  auth: authRouter,
  admin: adminRouter,
};

export type Router = typeof router;
