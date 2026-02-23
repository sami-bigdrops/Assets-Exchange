import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { getBatchPerformance } from "@/features/admin/services/batch-analytics.service";
import { handleApiError } from "@/lib/api-utils";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

async function checkAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return false;
  }
  return true;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin())) {
    logger.app.warn({}, "Unauthorized batch analytics request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: batchId } = await params;

    if (
      !batchId ||
      typeof batchId !== "string" ||
      batchId.trim().length === 0
    ) {
      logger.app.warn({ batchId }, "Invalid batch ID in analytics request");
      return NextResponse.json({ error: "Invalid batch ID" }, { status: 400 });
    }

    const result = await getBatchPerformance(batchId);

    if (!result) {
      logger.app.warn({ batchId }, "Batch not found for analytics");
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    logger.app.info(
      {
        batchId,
        impressions: result.totalImpressions,
        clicks: result.totalClicks,
        ctr: result.ctr,
      },
      "Retrieved batch performance analytics"
    );
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    logger.app.error(
      { error: err, errorMessage },
      "Failed to get batch analytics"
    );
    return handleApiError(err);
  }
}
