import { eq, and, gte, lt, sql, desc } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { assetsTable, dailyStats, publishers } from "@/lib/schema";

/**
 * Daily Stats Cron Job - Uses assets_table
 *
 * This cron job calculates daily statistics from assets_table:
 * - total_submitted: COUNT(*) for today
 * - total_approved: COUNT(*) WHERE status = 'APPROVED' for today
 * - avg_approval_time: AVG(approved_at - created_at) for approved rows
 * - top_publishers: top 5 publishers by volume (joined with publishers table for names)
 *   Format: [{ publisherId, publisherName, requestCount }]
 */

export const maxDuration = 300;
export const dynamic = "force-dynamic";

async function calculateDailyStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Convert to DATE format (YYYY-MM-DD string for PostgreSQL DATE type)
  const todayDate = today.toISOString().split("T")[0]!;

  const log = logger.child({ module: "daily-stats-cron" });

  try {
    log.info(
      {
        date: todayDate,
        timestamp: new Date().toISOString(),
        jobType: "daily-stats-calculation",
      },
      "Starting daily stats calculation from assets_table - Scheduled job runs once per day at 12:01 AM"
    );

    const assets = await db
      .select({
        id: assetsTable.id,
        publisherId: assetsTable.publisherId,
        status: assetsTable.status,
        createdAt: assetsTable.createdAt,
        approvedAt: assetsTable.approvedAt,
      })
      .from(assetsTable)
      .where(
        and(
          gte(assetsTable.createdAt, today),
          lt(assetsTable.createdAt, tomorrow)
        )
      );

    log.info({ count: assets.length }, "Fetched assets from assets_table");

    const totalSubmitted = assets.length;

    const approvedAssets = assets.filter((a) => a.status === "APPROVED");
    const totalApproved = approvedAssets.length;

    let avgApprovalTimeSeconds: number | null = null;
    const approvedWithTimestamps = approvedAssets.filter(
      (a) => a.createdAt && a.approvedAt
    );
    if (approvedWithTimestamps.length > 0) {
      const totalApprovalTimeMs = approvedWithTimestamps.reduce((sum, a) => {
        const created = new Date(a.createdAt!).getTime();
        const approved = new Date(a.approvedAt!).getTime();
        return sum + (approved - created);
      }, 0);
      // Convert milliseconds to seconds (DOUBLE PRECISION)
      avgApprovalTimeSeconds =
        totalApprovalTimeMs / 1000 / approvedWithTimestamps.length;
    }

    // Calculate top publishers with join to publishers table to get names
    // Group by publisher_id, count assets, join with publishers for names
    const topPublishersRaw = await db
      .select({
        publisherId: assetsTable.publisherId,
        publisherName: publishers.name,
        count: sql<number>`COUNT(${assetsTable.id})::int`.as("count"),
      })
      .from(assetsTable)
      .leftJoin(publishers, eq(assetsTable.publisherId, publishers.id))
      .where(
        and(
          gte(assetsTable.createdAt, today),
          lt(assetsTable.createdAt, tomorrow)
        )
      )
      .groupBy(assetsTable.publisherId, publishers.name)
      .orderBy(desc(sql`COUNT(${assetsTable.id})`))
      .limit(5);

    log.info(
      {
        rawTopPublishers: topPublishersRaw,
        count: topPublishersRaw.length,
      },
      "Raw SQL result for top publishers (before formatting)"
    );

    const topPublishers = topPublishersRaw.map((row) => ({
      publisherId: row.publisherId,
      publisherName: row.publisherName || "Unknown Publisher",
      requestCount: row.count,
    }));

    log.info(
      {
        topPublishers,
        formattedCount: topPublishers.length,
      },
      "Final top_publishers JSON being inserted into daily_stats"
    );

    const stats = {
      date: todayDate,
      totalSubmitted,
      totalApproved,
      avgApprovalTimeSeconds,
      topPublishers,
    };

    log.info(stats, "Calculated daily stats");

    const existing = await db
      .select()
      .from(dailyStats)
      .where(eq(dailyStats.date, todayDate))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(dailyStats)
        .set({
          totalSubmitted: stats.totalSubmitted,
          totalApproved: stats.totalApproved,
          avgApprovalTimeSeconds: stats.avgApprovalTimeSeconds,
          topPublishers: stats.topPublishers,
        })
        .where(eq(dailyStats.date, todayDate));

      log.info(
        {
          date: todayDate,
          action: "updated",
          totalSubmitted: stats.totalSubmitted,
          totalApproved: stats.totalApproved,
          avgApprovalTimeSeconds: stats.avgApprovalTimeSeconds,
          topPublishersCount: stats.topPublishers.length,
        },
        "Updated existing daily stats row for today"
      );
    } else {
      await db.insert(dailyStats).values({
        date: todayDate,
        totalSubmitted: stats.totalSubmitted,
        totalApproved: stats.totalApproved,
        avgApprovalTimeSeconds: stats.avgApprovalTimeSeconds,
        topPublishers: stats.topPublishers,
      });

      log.info(
        {
          date: todayDate,
          action: "inserted",
          totalSubmitted: stats.totalSubmitted,
          totalApproved: stats.totalApproved,
          avgApprovalTimeSeconds: stats.avgApprovalTimeSeconds,
          topPublishersCount: stats.topPublishers.length,
        },
        "Inserted new daily stats row for today - Exactly one row per day"
      );
    }

    return {
      success: true,
      stats,
    };
  } catch (error) {
    log.error({ error }, "Failed to calculate daily stats");
    throw error;
  }
}

export async function GET(req: Request) {
  const vercelCronHeader = req.headers.get("x-vercel-cron");
  const authHeader = req.headers.get("Authorization");
  const userAgent = req.headers.get("user-agent") || "";
  const cronSecret = process.env.CRON_SECRET;

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const isAdmin = session?.user?.role === "admin";

  if (!isAdmin) {
    const isVercelCron =
      vercelCronHeader === "1" || userAgent.includes("vercel-cron");
    const isAuthorizedSecret =
      cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isVercelCron && !isAuthorizedSecret) {
      logger.warn(
        {
          hasHeader: !!vercelCronHeader,
          headerValue: vercelCronHeader,
          userAgent,
          hasAuthHeader: !!authHeader,
          hasCronSecret: !!cronSecret,
          isProduction: process.env.NODE_ENV === "production",
        },
        "Daily stats cron endpoint accessed without authorization"
      );
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const startTime = Date.now();
    const result = await calculateDailyStats();
    const duration = Date.now() - startTime;

    logger.info(
      {
        duration: `${duration}ms`,
        date: result.stats.date,
        success: true,
      },
      "Daily stats cron job completed successfully"
    );

    return NextResponse.json({
      success: true,
      message: "Daily stats calculated successfully",
      data: result.stats,
      duration: `${duration}ms`,
    });
  } catch (error) {
    logger.error(
      {
        error,
        timestamp: new Date().toISOString(),
        jobType: "daily-stats-cron",
      },
      "Daily stats cron job failed"
    );
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
