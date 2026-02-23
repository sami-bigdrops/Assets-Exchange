import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withRequestContext } from "@/lib/requestContext";
import { creatives } from "@/lib/schema";

export const dynamic = "force-dynamic";

const STUCK_THRESHOLD_MINUTES = 15;

export async function GET(_req: Request) {
  return withRequestContext(async () => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (
      !session ||
      (session.user.role !== "admin" && session.user.role !== "administrator")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const stuckJobs = await db
        .select({
          id: creatives.id,
          status: creatives.status,
          statusUpdatedAt: creatives.statusUpdatedAt,
          scanAttempts: creatives.scanAttempts,
          createdAt: creatives.createdAt,
          updatedAt: creatives.updatedAt,
          lastScanError: creatives.lastScanError,
          requestId: creatives.requestId,
        })
        .from(creatives)
        .where(
          and(
            eq(creatives.status, "SCANNING"),
            sql`${creatives.statusUpdatedAt} < now() - (${STUCK_THRESHOLD_MINUTES} * interval '1 minute')`
          )
        )
        .orderBy(sql`${creatives.statusUpdatedAt} ASC`);

      return NextResponse.json({ stuckJobs });
    } catch (error) {
      logger.error({
        action: "ops.stuck-jobs",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return NextResponse.json(
        { error: "Failed to fetch stuck jobs" },
        { status: 500 }
      );
    }
  });
}
