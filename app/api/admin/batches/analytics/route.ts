import { headers } from "next/headers";
import { NextResponse } from "next/server";

import {
  getBatchesPerformance,
  getAllActiveBatchesPerformance,
} from "@/features/admin/services/batch-analytics.service";
import { handleApiError } from "@/lib/api-utils";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { batchAnalyticsQuerySchema } from "@/lib/validations/admin";

async function checkAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return false;
  }
  return true;
}

export async function GET(req: Request) {
  if (!(await checkAdmin())) {
    logger.app.warn({}, "Unauthorized batch analytics request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const batchIdsParam = searchParams.get("batchIds");

    if (!batchIdsParam) {
      const result = await getAllActiveBatchesPerformance();
      logger.app.info(
        { batchCount: result.batches.length },
        "Retrieved all active batches performance"
      );
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    const parsed = batchAnalyticsQuerySchema.safeParse({
      batchIds: batchIdsParam,
    });

    if (!parsed.success) {
      logger.app.warn(
        { batchIdsParam, errors: parsed.error.flatten() },
        "Invalid query parameters for batch analytics"
      );
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const batchIds = batchIdsParam
      ?.split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (!batchIds || batchIds.length === 0) {
      logger.app.warn({ batchIdsParam }, "No valid batch IDs provided");
      return NextResponse.json(
        { error: "At least one batch ID is required" },
        { status: 400 }
      );
    }

    const result = await getBatchesPerformance(batchIds);
    logger.app.info(
      { batchIds, batchCount: result.batches.length },
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
