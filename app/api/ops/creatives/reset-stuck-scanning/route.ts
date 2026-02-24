import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { auditLogs, creatives } from "@/lib/schema";

export const dynamic = "force-dynamic";

const STUCK_THRESHOLD_MINUTES = 15;

export async function POST(_req: Request) {
  logger.info("=".repeat(80));
  logger.info("RESET STUCK JOB ENDPOINT HIT");
  logger.info("=".repeat(80));

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (
      !session ||
      (session.user.role !== "admin" && session.user.role !== "administrator")
    ) {
      logger.info("❌ UNAUTHORIZED - Admin check failed");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info({
      message: "✅ Admin authenticated",
      userId: session.user.id,
      role: session.user.role,
    });

    logger.info({
      message: "📊 Query Parameters",
      thresholdMinutes: STUCK_THRESHOLD_MINUTES,
      statusFilter: "SCANNING",
      timeCondition: `status_updated_at < now() - (${STUCK_THRESHOLD_MINUTES} * interval '1 minute')`,
      note: "Using database-native time logic with parameterized interval multiplication",
    });

    logger.info("🔍 EXECUTING STUCK JOB RESET QUERY (SELECT)");
    logger.info({
      message: "Query Details",
      table: "creatives",
      whereConditions: [
        "status = 'SCANNING'",
        `status_updated_at < now() - (${STUCK_THRESHOLD_MINUTES} * interval '1 minute')`,
      ],
      selectFields: ["id", "status", "status_updated_at", "scan_attempts"],
      sqlLogic:
        "Database-native time comparison with parameterized interval (PostgreSQL-safe)",
    });

    let stuckCreatives;
    try {
      stuckCreatives = await db
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
            sql`${creatives.statusUpdatedAt} < now() - (${STUCK_THRESHOLD_MINUTES} * interval '1 minute')`
          )
        );
    } catch (selectError) {
      logger.error({
        action: "creatives.reset_stuck_scanning",
        error:
          selectError instanceof Error
            ? selectError.message
            : String(selectError),
        stack: selectError instanceof Error ? selectError.stack : undefined,
        message: "SELECT query failed",
      });
      throw selectError;
    }

    logger.info({
      message: "📋 SELECT Query Result",
      rowsFound: stuckCreatives.length,
      creativeIds: stuckCreatives.map((c) => c.id),
      details: stuckCreatives.map((c) => ({
        id: c.id,
        status: c.status,
        statusUpdatedAt: c.statusUpdatedAt?.toISOString(),
        scanAttempts: c.scanAttempts,
      })),
    });

    if (stuckCreatives.length === 0) {
      logger.info("ℹ️  No stuck creatives found - returning early");
      logger.info({
        action: "creatives.reset_stuck_scanning",
        actorId: session.user.id,
        message: "No stuck SCANNING creatives found",
      });

      const requestHeaders = await headers();
      const ipAddress =
        requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        requestHeaders.get("x-real-ip") ??
        null;
      const userAgent = requestHeaders.get("user-agent") ?? null;

      try {
        await db.insert(auditLogs).values({
          userId: session.user.id,
          action: "RESET_STUCK_SCANNING_ASSETS",
          entityType: "creatives",
          entityId: null,
          details: {
            triggeringUser: {
              userId: session.user.id,
              userEmail: session.user.email,
              userName: session.user.name,
            },
            timestamp: new Date().toISOString(),
            affectedAssetCount: 0,
            affectedAssetIds: [],
            thresholdMinutes: STUCK_THRESHOLD_MINUTES,
            message: "No stuck assets found",
          },
          ipAddress,
          userAgent,
          createdAt: new Date(),
        });
      } catch (auditError) {
        logger.error({
          action: "creatives.reset_stuck_scanning",
          actorId: session.user.id,
          error:
            auditError instanceof Error
              ? auditError.message
              : String(auditError),
          message: "Failed to create audit log entry",
        });
      }

      return NextResponse.json({
        reset: 0,
        ids: [],
      });
    }

    const creativeIds = stuckCreatives.map((c) => c.id);

    logger.info("🔧 EXECUTING STUCK JOB RESET QUERY (UPDATE)");
    logger.info({
      message: "Update Query Details",
      table: "creatives",
      whereConditions: [
        "status = 'SCANNING'",
        `status_updated_at < now() - (${STUCK_THRESHOLD_MINUTES} * interval '1 minute')`,
      ],
      updateFields: {
        status: "pending",
        statusUpdatedAt: "now() (database function)",
        updatedAt: "now() (database function)",
        scanAttempts: "scan_attempts + 1 (increment)",
        lastScanError: `COALESCE(last_scan_error, 'Reset by admin: stuck in SCANNING status for >${STUCK_THRESHOLD_MINUTES} minutes')`,
      },
      expectedAffectedRows: creativeIds.length,
      creativeIds,
      sqlLogic: "Database-native time comparison (not JS Date math)",
    });

    const requestHeaders = await headers();
    const ipAddress =
      requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      requestHeaders.get("x-real-ip") ??
      null;
    const userAgent = requestHeaders.get("user-agent") ?? null;
    const executionTimestamp = new Date();

    let updateResult: Array<{ id: string }> = [];
    try {
      // Use transaction to ensure atomicity of UPDATE and audit log
      await db.transaction(async (tx) => {
        // Re-check conditions in UPDATE to handle concurrent changes
        updateResult = await tx
          .update(creatives)
          .set({
            status: "pending",
            statusUpdatedAt: sql`now()`,
            updatedAt: sql`now()`,
            scanAttempts: sql`${creatives.scanAttempts} + 1`,
            lastScanError: sql`COALESCE(${creatives.lastScanError}, 'Reset by admin: stuck in SCANNING status for >${STUCK_THRESHOLD_MINUTES} minutes')`,
          })
          .where(
            and(
              eq(creatives.status, "SCANNING"),
              sql`${creatives.statusUpdatedAt} < now() - (${STUCK_THRESHOLD_MINUTES} * interval '1 minute')`
            )
          )
          .returning({ id: creatives.id });

        const actualRowsUpdated = updateResult.length;

        // Write audit log in same transaction
        await tx.insert(auditLogs).values({
          userId: session.user.id,
          action: "RESET_STUCK_SCANNING_ASSETS",
          entityType: "creatives",
          entityId: null,
          details: {
            triggeringUser: {
              userId: session.user.id,
              userEmail: session.user.email,
              userName: session.user.name,
            },
            timestamp: executionTimestamp.toISOString(),
            affectedAssetCount: actualRowsUpdated,
            affectedAssetIds: updateResult.map((r) => r.id),
            thresholdMinutes: STUCK_THRESHOLD_MINUTES,
            previousStatus: "SCANNING",
            newStatus: "PENDING",
          },
          ipAddress,
          userAgent,
          createdAt: executionTimestamp,
        });
      });
    } catch (updateError) {
      logger.error({
        action: "creatives.reset_stuck_scanning",
        error:
          updateError instanceof Error
            ? updateError.message
            : String(updateError),
        stack: updateError instanceof Error ? updateError.stack : undefined,
        name: updateError instanceof Error ? updateError.name : undefined,
        message: "UPDATE query failed in transaction",
      });
      throw updateError;
    }

    const actualRowsUpdated = updateResult.length;

    logger.info({ message: "✅ ROWS UPDATED", count: actualRowsUpdated });
    logger.info({
      message: "Update Result",
      rowsAffected: actualRowsUpdated,
      expectedRows: creativeIds.length,
      match:
        actualRowsUpdated === creativeIds.length ? "✅ MATCH" : "⚠️ MISMATCH",
      updatedCreativeIds: updateResult.map((r) => r.id),
      newStatus: "pending",
      timestampSource: "Database now() function",
    });
    logger.info("=".repeat(80));

    logger.info({
      action: "creatives.reset_stuck_scanning",
      actorId: session.user.id,
      resetCount: actualRowsUpdated,
      expectedCount: creativeIds.length,
      creativeIds: updateResult.map((r) => r.id),
      message: "Audit log entry created successfully in transaction",
    });

    return NextResponse.json({
      reset: actualRowsUpdated,
      ids: updateResult.map((r) => r.id),
    });
  } catch (error) {
    logger.error({
      action: "creatives.reset_stuck_scanning",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : "Unknown",
      cause: error instanceof Error ? error.cause : undefined,
      message: "Unhandled error in reset stuck job endpoint",
    });
    logger.info("=".repeat(80));

    return NextResponse.json(
      {
        error: "Failed to reset stuck SCANNING creatives",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
