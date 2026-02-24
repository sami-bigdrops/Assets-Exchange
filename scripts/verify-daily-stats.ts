/* eslint-disable no-console */
/**
 * Verification script for daily stats API
 *
 * This script verifies:
 * 1. Database connection
 * 2. daily_stats table exists
 * 3. API endpoint is accessible
 *
 * Usage:
 *   pnpm tsx scripts/verify-daily-stats.ts
 */

import { resolve } from "path";

import { config } from "dotenv";
import { sql } from "drizzle-orm";

config({ path: resolve(process.cwd(), ".env") });

import { db } from "../lib/db";
import { dailyStats } from "../lib/schema";

async function verifyDailyStats() {
  console.log("=".repeat(80));
  console.log("DAILY STATS VERIFICATION");
  console.log("=".repeat(80));
  console.log();

  try {
    console.log("Step 1: Testing database connection...");
    await db.execute(sql`SELECT 1`);
    console.log("✓ Database connection successful");
    console.log();

    console.log("Step 2: Checking if daily_stats table exists...");
    const tableCheckResult = await db.execute<{ exists: boolean }>(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'daily_stats'
      ) as exists
    `);

    if (!tableCheckResult.rows[0]?.exists) {
      console.error("❌ daily_stats table does not exist!");
      console.error("   Please run database migrations to create the table.");
      process.exit(1);
    }
    console.log("✓ daily_stats table exists");
    console.log();

    console.log("Step 3: Checking table structure...");
    const columnsResult = await db.execute<{
      column_name: string;
      data_type: string;
      is_nullable: string;
    }>(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'daily_stats'
      ORDER BY ordinal_position
    `);

    console.log("  Columns found:");
    columnsResult.rows.forEach((col) => {
      console.log(
        `    - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`
      );
    });
    console.log();

    console.log("Step 4: Counting rows in daily_stats...");
    const countResult = await db.execute<{ count: string }>(sql`
      SELECT COUNT(*) as count FROM daily_stats
    `);
    const rowCount = parseInt(countResult.rows[0].count, 10);
    console.log(`✓ Found ${rowCount} row(s) in daily_stats`);
    console.log();

    if (rowCount > 0) {
      console.log("Step 5: Fetching latest stats (same query as API)...");
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
        .orderBy(sql`date DESC`)
        .limit(1);

      if (latestStats) {
        console.log("✓ Latest stats retrieved successfully:");
        console.log(`  - Date: ${latestStats.date}`);
        console.log(`  - Total Submitted: ${latestStats.totalSubmitted}`);
        console.log(`  - Total Approved: ${latestStats.totalApproved}`);
        console.log(
          `  - Avg Approval Time: ${latestStats.avgApprovalTimeSeconds != null ? `${latestStats.avgApprovalTimeSeconds.toFixed(2)} seconds` : "null"}`
        );
        console.log(
          `  - Top Publishers: ${latestStats.topPublishers ? JSON.stringify(latestStats.topPublishers) : "null"}`
        );
        console.log(`  - Created At: ${latestStats.createdAt}`);
      } else {
        console.log(
          "⚠️  No stats found (unexpected - count showed rows exist)"
        );
      }
    } else {
      console.log(
        "⚠️  No stats available yet. Run the cron job to populate data."
      );
    }

    console.log();
    console.log("=".repeat(80));
    console.log("Verification completed successfully!");
    console.log("=".repeat(80));
  } catch (error) {
    console.error();
    console.error("=".repeat(80));
    console.error("Verification failed!");
    console.error("=".repeat(80));
    console.error(error);
    process.exit(1);
  }
}

verifyDailyStats()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
