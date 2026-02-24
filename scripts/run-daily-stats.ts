/* eslint-disable no-console */
/**
 * Manual Daily Stats Job Runner
 *
 * This script manually runs the daily stats calculation job for testing.
 *
 * Usage:
 *   pnpm tsx scripts/run-daily-stats.ts
 */

import { resolve } from "path";

import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env") });

async function runDailyStats() {
  console.log("=".repeat(80));
  console.log("DAILY STATS JOB - MANUAL RUN");
  console.log("=".repeat(80));
  console.log();

  const baseUrl =
    process.env.BETTER_AUTH_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("❌ CRON_SECRET environment variable is not set");
    console.error(
      "   Please set CRON_SECRET in your .env file to run this script"
    );
    process.exit(1);
  }

  const url = `${baseUrl}/api/cron/daily-stats`;
  console.log(`📡 Calling: ${url}`);
  console.log();

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Job failed:");
      console.error(JSON.stringify(data, null, 2));
      process.exit(1);
    }

    console.log("✅ Job completed successfully!");
    console.log();
    console.log("Results:");
    console.log(JSON.stringify(data, null, 2));
    console.log();
  } catch (error) {
    console.error("❌ Error running daily stats job:");
    console.error(error);
    process.exit(1);
  }
}

runDailyStats()
  .then(() => {
    console.log();
    console.log("=".repeat(80));
    console.log("Script completed");
    console.log("=".repeat(80));
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
