import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { backgroundJobs, creatives } from "@/lib/schema";

export const dynamic = "force-dynamic";

const MAX_BATCH_SIZE = 100;
const DISCOVERY_WINDOW_HOURS = 24;

async function discoverPendingCreatives() {
  logger.info({
    action: "discover_pending_creatives",
    message: "Starting discovery of pending creatives",
  });

  try {
    const pendingCreatives = await db
      .select({
        id: creatives.id,
        url: creatives.url,
        type: creatives.type,
        status: creatives.status,
        scanAttempts: creatives.scanAttempts,
        statusUpdatedAt: creatives.statusUpdatedAt,
      })
      .from(creatives)
      .where(
        and(
          eq(creatives.status, "pending"),
          sql`${creatives.statusUpdatedAt} > now() - interval '${DISCOVERY_WINDOW_HOURS} hours'`,
          sql`NOT EXISTS (
            SELECT 1 FROM ${backgroundJobs}
            WHERE ${backgroundJobs.type} = 'creative_scan'
              AND (${backgroundJobs.payload}->>'creativeId') = ${creatives.id}::text
              AND ${backgroundJobs.status} IN ('pending', 'running')
          )`
        )
      )
      .orderBy(creatives.statusUpdatedAt)
      .limit(MAX_BATCH_SIZE);

    logger.info({
      action: "discover_pending_creatives",
      foundCount: pendingCreatives.length,
      message: `Found ${pendingCreatives.length} pending creatives without active scan jobs`,
    });

    if (pendingCreatives.length === 0) {
      return {
        discovered: 0,
        enqueued: 0,
        skipped: 0,
      };
    }

    let enqueued = 0;
    let skipped = 0;

    for (const creative of pendingCreatives) {
      try {
        await db.insert(backgroundJobs).values({
          type: "creative_scan",
          status: "pending",
          payload: {
            creativeId: creative.id,
            url: creative.url,
            type: creative.type,
          },
          nextRunAt: new Date(),
          maxRetries: 5,
        });

        enqueued++;
      } catch (error) {
        if (error instanceof Error && error.message.includes("duplicate key")) {
          skipped++;
          logger.warn({
            action: "discover_pending_creatives",
            creativeId: creative.id,
            message: "Job already exists, skipping",
          });
        } else {
          logger.error({
            action: "discover_pending_creatives",
            creativeId: creative.id,
            error: error instanceof Error ? error.message : String(error),
            message: "Failed to enqueue scan job",
          });
        }
      }
    }

    logger.info({
      action: "discover_pending_creatives",
      discovered: pendingCreatives.length,
      enqueued,
      skipped,
      message: `Discovery complete: ${enqueued} jobs enqueued, ${skipped} skipped`,
    });

    return {
      discovered: pendingCreatives.length,
      enqueued,
      skipped,
    };
  } catch (error) {
    logger.error({
      action: "discover_pending_creatives",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      message: "Discovery failed",
    });
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
      logger.warn({
        action: "discover_pending_creatives",
        message: "Unauthorized access attempt",
        hasHeader: !!vercelCronHeader,
        userAgent,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await discoverPendingCreatives();

    return NextResponse.json({
      message: "Discovery completed",
      ...result,
    });
  } catch (error) {
    logger.error({
      action: "discover_pending_creatives",
      error: error instanceof Error ? error.message : String(error),
      message: "Discovery endpoint failed",
    });

    return NextResponse.json(
      {
        error: "Discovery failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
