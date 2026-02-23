import { createId } from "@paralleldrive/cuid2";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { removeAssetFromBatch } from "@/features/admin/services/batch.service";
import { handleApiError } from "@/lib/api-utils";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRateLimitKey } from "@/lib/getRateLimitKey";
import { logger } from "@/lib/logger";
import { ratelimit } from "@/lib/ratelimit";
import { batchAssets, batches, assetsTable } from "@/lib/schema";

async function enforceRateLimit() {
  const key = await getRateLimitKey();
  const { success } = await ratelimit.limit(key);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }
}

async function checkAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return false;
  }
  return true;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  if (!(await checkAdmin())) {
    logger.app.warn({}, "Unauthorized asset assignment request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rl = await enforceRateLimit();
    if (rl) {
      logger.app.warn({}, "Rate limit exceeded for asset assignment");
      return rl;
    }

    const { id: batchId, assetId } = await params;

    if (
      !batchId ||
      typeof batchId !== "string" ||
      batchId.trim().length === 0
    ) {
      logger.app.warn(
        { batchId, assetId },
        "Invalid batch ID in asset assignment"
      );
      return NextResponse.json({ error: "Invalid batch ID" }, { status: 400 });
    }

    if (
      !assetId ||
      typeof assetId !== "string" ||
      assetId.trim().length === 0
    ) {
      logger.app.warn(
        { batchId, assetId },
        "Invalid asset ID in asset assignment"
      );
      return NextResponse.json({ error: "Invalid asset ID" }, { status: 400 });
    }

    const batch = await db
      .select()
      .from(batches)
      .where(eq(batches.id, batchId))
      .limit(1);

    if (batch.length === 0) {
      logger.app.warn(
        { batchId, assetId },
        "Batch not found for asset assignment"
      );
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const asset = await db
      .select()
      .from(assetsTable)
      .where(eq(assetsTable.id, assetId))
      .limit(1);

    if (asset.length === 0) {
      logger.app.warn({ batchId, assetId }, "Asset not found for assignment");
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const existingAssignment = await db
      .select()
      .from(batchAssets)
      .where(
        and(eq(batchAssets.batchId, batchId), eq(batchAssets.assetId, assetId))
      )
      .limit(1);

    if (existingAssignment.length > 0) {
      logger.app.warn({ batchId, assetId }, "Asset already assigned to batch");
      return NextResponse.json(
        { error: "Asset is already assigned to this batch" },
        { status: 400 }
      );
    }

    try {
      await db.insert(batchAssets).values({
        id: createId(),
        batchId,
        assetId,
        createdAt: new Date(),
      });

      logger.app.info(
        { batchId, assetId },
        "Asset assigned to batch successfully"
      );
      return NextResponse.json({ success: true }, { status: 201 });
    } catch (dbError) {
      logger.app.error(
        { error: dbError, batchId, assetId },
        "Database error during asset assignment"
      );
      throw new Error("Failed to assign asset to batch");
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    logger.app.error(
      { error: err, errorMessage },
      "Failed to assign asset to batch"
    );
    return handleApiError(err);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  if (!(await checkAdmin())) {
    logger.app.warn({}, "Unauthorized asset removal request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rl = await enforceRateLimit();
    if (rl) {
      logger.app.warn({}, "Rate limit exceeded for asset removal");
      return rl;
    }

    const { id: batchId, assetId } = await params;

    if (
      !batchId ||
      typeof batchId !== "string" ||
      batchId.trim().length === 0
    ) {
      logger.app.warn(
        { batchId, assetId },
        "Invalid batch ID in asset removal"
      );
      return NextResponse.json({ error: "Invalid batch ID" }, { status: 400 });
    }

    if (
      !assetId ||
      typeof assetId !== "string" ||
      assetId.trim().length === 0
    ) {
      logger.app.warn(
        { batchId, assetId },
        "Invalid asset ID in asset removal"
      );
      return NextResponse.json({ error: "Invalid asset ID" }, { status: 400 });
    }

    const updatedBatch = await removeAssetFromBatch(batchId, assetId);
    logger.app.info(
      { batchId, assetId },
      "Asset removed from batch successfully"
    );
    return NextResponse.json(updatedBatch);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    logger.app.error(
      { error: err, errorMessage },
      "Failed to remove asset from batch"
    );
    return handleApiError(err);
  }
}
