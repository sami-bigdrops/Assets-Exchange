import { desc } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dailyStats } from "@/lib/schema";

export const dynamic = "force-dynamic";

/**
 * Fast read-only endpoint for admin dashboard daily statistics.
 *
 * IMPORTANT: This endpoint ONLY reads from daily_stats table.
 * It NEVER recalculates or aggregates data on request.
 * Daily stats are calculated once per day at 12:01 AM via scheduled cron job.
 *
 * Returns the latest available stats row optimized for single-row indexed lookup.
 * Safe to call on every dashboard load - no heavy computation.
 */
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const [latestStats] = await db
      .select({
        date: dailyStats.date,
        totalSubmitted: dailyStats.totalSubmitted,
        totalApproved: dailyStats.totalApproved,
        avgApprovalTimeSeconds: dailyStats.avgApprovalTimeSeconds,
        topPublishers: dailyStats.topPublishers,
        createdAt: dailyStats.createdAt,
      })
      .from(dailyStats)
      .orderBy(desc(dailyStats.date))
      .limit(1);

    if (!latestStats) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "No daily stats available yet",
      });
    }

    // Convert avgApprovalTimeSeconds (seconds) to milliseconds for frontend compatibility
    const avgApprovalTimeMs =
      latestStats.avgApprovalTimeSeconds != null
        ? Math.round(latestStats.avgApprovalTimeSeconds * 1000)
        : null;

    return NextResponse.json({
      success: true,
      data: {
        date: latestStats.date,
        totalSubmitted: latestStats.totalSubmitted,
        totalApproved: latestStats.totalApproved,
        avgApprovalTime: avgApprovalTimeMs,
        topPublishers: latestStats.topPublishers,
        lastUpdated: latestStats.createdAt,
      },
    });
  } catch (error) {
    // Only log errors in development to keep production logs clean
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching daily stats:", error);
    }
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        ...(process.env.NODE_ENV === "development" && { stack: errorStack }),
      },
      { status: 500 }
    );
  }
}
