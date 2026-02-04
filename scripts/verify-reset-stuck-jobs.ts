/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Verification Script for Reset Stuck Jobs Functionality
 *
 * This script helps verify that the "Reset Stuck Jobs" button:
 * 1. Changes database state correctly
 * 2. Creates proper audit logs
 * 3. Ensures items are reprocessed
 *
 * Usage:
 *   pnpm tsx scripts/verify-reset-stuck-jobs.ts
 */

import { and, eq, gte, inArray, like, sql } from "drizzle-orm";

import { db } from "../lib/db";
import { auditLogs, creatives } from "../lib/schema";

async function verifyResetStuckJobs() {
  console.log("=".repeat(80));
  console.log("RESET STUCK JOBS VERIFICATION SCRIPT");
  console.log("=".repeat(80));
  console.log();

  try {
    // Step 1: Check for stuck creatives before reset
    console.log("📊 STEP 1: Checking for stuck creatives...");
    const stuckBefore = await db
      .select({
        id: creatives.id,
        status: creatives.status,
        statusUpdatedAt: creatives.statusUpdatedAt,
        scanAttempts: creatives.scanAttempts,
      })
      .from(creatives)
      .where(
        and(
          eq(creatives.status, "SCANNING"),
          sql`${creatives.statusUpdatedAt} < now() - interval '15 minutes'`
        )
      );

    console.log(`Found ${stuckBefore.length} stuck creatives`);
    if (stuckBefore.length > 0) {
      console.log(
        "Stuck creative IDs:",
        stuckBefore.map((c) => c.id)
      );
      console.log("Oldest stuck:", stuckBefore[0]?.statusUpdatedAt);
    }
    console.log();

    // Step 2: Check recent audit logs
    console.log("📋 STEP 2: Checking recent audit logs...");
    const recentAuditLogs = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.action, "RESET_STUCK_SCANNING_ASSETS"),
          gte(auditLogs.createdAt, sql`now() - interval '10 minutes'`)
        )
      )
      .orderBy(auditLogs.createdAt);

    console.log(`Found ${recentAuditLogs.length} recent audit log entries`);
    recentAuditLogs.forEach((log, index) => {
      console.log(`\nAudit Log ${index + 1}:`);
      console.log(`  ID: ${log.id}`);
      console.log(`  User ID: ${log.userId}`);
      console.log(`  Action: ${log.action}`);
      console.log(`  Created At: ${log.createdAt}`);
      console.log(
        `  Affected Count: ${(log.details as any)?.affectedAssetCount ?? "N/A"}`
      );
      console.log(
        `  Affected IDs: ${JSON.stringify((log.details as any)?.affectedAssetIds ?? [])}`
      );
    });
    console.log();

    // Step 3: Check for reset items (pending with reset message)
    console.log("🔄 STEP 3: Checking for reset items...");
    const resetItems = await db
      .select({
        id: creatives.id,
        status: creatives.status,
        statusUpdatedAt: creatives.statusUpdatedAt,
        scanAttempts: creatives.scanAttempts,
        lastScanError: creatives.lastScanError,
        updatedAt: creatives.updatedAt,
      })
      .from(creatives)
      .where(
        and(
          eq(creatives.status, "pending"),
          like(creatives.lastScanError, "%Reset by admin%"),
          gte(creatives.updatedAt, sql`now() - interval '10 minutes'`)
        )
      );

    console.log(`Found ${resetItems.length} items reset in last 10 minutes`);
    if (resetItems.length > 0) {
      console.log(
        "Reset item IDs:",
        resetItems.map((c) => c.id)
      );
      console.log("Most recent reset:", resetItems[0]?.updatedAt);
    }
    console.log();

    // Step 4: Verify status changes match
    console.log("✅ STEP 4: Verifying status changes...");
    if (stuckBefore.length > 0 && resetItems.length > 0) {
      const stuckIds = new Set(stuckBefore.map((c) => c.id));
      const resetIds = new Set(resetItems.map((c) => c.id));

      const matchedIds = Array.from(stuckIds).filter((id) => resetIds.has(id));
      const unmatchedStuck = Array.from(stuckIds).filter(
        (id) => !resetIds.has(id)
      );
      const unmatchedReset = Array.from(resetIds).filter(
        (id) => !stuckIds.has(id)
      );

      console.log(`Matched IDs: ${matchedIds.length}`);
      if (matchedIds.length > 0) {
        console.log("  IDs:", matchedIds);
      }

      if (unmatchedStuck.length > 0) {
        console.log(
          `⚠️  Warning: ${unmatchedStuck.length} stuck items not found in reset items`
        );
        console.log("  IDs:", unmatchedStuck);
      }

      if (unmatchedReset.length > 0) {
        console.log(
          `ℹ️  Info: ${unmatchedReset.length} reset items not in original stuck list`
        );
        console.log("  IDs:", unmatchedReset);
      }
    }
    console.log();

    // Step 5: Check if reset items are being processed
    console.log("⚙️  STEP 5: Checking if reset items are being processed...");
    if (resetItems.length > 0) {
      const resetIds = resetItems.map((c) => c.id);
      const processingItems = await db
        .select({
          id: creatives.id,
          status: creatives.status,
          statusUpdatedAt: creatives.statusUpdatedAt,
        })
        .from(creatives)
        .where(
          and(eq(creatives.status, "SCANNING"), inArray(creatives.id, resetIds))
        );

      console.log(
        `${processingItems.length} reset items are now being processed (SCANNING)`
      );
      if (processingItems.length > 0) {
        console.log(
          "Processing IDs:",
          processingItems.map((c) => c.id)
        );
      }

      const stillPending = resetIds.filter(
        (id) => !processingItems.some((p) => p.id === id)
      );
      if (stillPending.length > 0) {
        console.log(
          `${stillPending.length} items still pending (awaiting processing)`
        );
      }
    }
    console.log();

    // Step 6: Summary
    console.log("=".repeat(80));
    console.log("VERIFICATION SUMMARY");
    console.log("=".repeat(80));
    console.log(`Stuck creatives found: ${stuckBefore.length}`);
    console.log(`Recent audit logs: ${recentAuditLogs.length}`);
    console.log(`Reset items (last 10 min): ${resetItems.length}`);
    console.log();

    if (recentAuditLogs.length > 0) {
      const latestLog = recentAuditLogs[recentAuditLogs.length - 1];
      const details = latestLog.details as any;
      console.log("Latest Audit Log Details:");
      console.log(`  Admin User ID: ${latestLog.userId}`);
      console.log(
        `  Admin Email: ${details?.triggeringUser?.userEmail ?? "N/A"}`
      );
      console.log(
        `  Admin Name: ${details?.triggeringUser?.userName ?? "N/A"}`
      );
      console.log(`  Timestamp: ${latestLog.createdAt}`);
      console.log(`  Affected Count: ${details?.affectedAssetCount ?? 0}`);
      console.log(`  Threshold: ${details?.thresholdMinutes ?? "N/A"} minutes`);
    }

    console.log();
    console.log("✅ Verification complete!");
    console.log("=".repeat(80));
  } catch (error) {
    console.error("❌ Verification failed:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Stack:", error.stack);
    }
    process.exit(1);
  }
}

verifyResetStuckJobs()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
