import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { moveAssetBetweenBatches } from "@/features/admin/services/batch.service";
import { handleApiError } from "@/lib/api-utils";
import { auth } from "@/lib/auth";
import { getRateLimitKey } from "@/lib/getRateLimitKey";
import { logger } from "@/lib/logger";
import { ratelimit } from "@/lib/ratelimit";
import { moveAssetBetweenBatchesSchema } from "@/lib/validations/admin";

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
    logger.app.warn({}, "Unauthorized asset move request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rl = await enforceRateLimit();
    if (rl) {
      logger.app.warn({}, "Rate limit exceeded for asset move");
      return rl;
    }

    const { id: fromBatchId, assetId } = await params;

    if (
      !fromBatchId ||
      typeof fromBatchId !== "string" ||
      fromBatchId.trim().length === 0
    ) {
      logger.app.warn(
        { fromBatchId, assetId },
        "Invalid source batch ID in asset move"
      );
      return NextResponse.json(
        { error: "Invalid source batch ID" },
        { status: 400 }
      );
    }

    if (
      !assetId ||
      typeof assetId !== "string" ||
      assetId.trim().length === 0
    ) {
      logger.app.warn(
        { fromBatchId, assetId },
        "Invalid asset ID in asset move"
      );
      return NextResponse.json({ error: "Invalid asset ID" }, { status: 400 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      logger.app.warn(
        { error: parseError, fromBatchId, assetId },
        "Invalid JSON body in asset move request"
      );
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = moveAssetBetweenBatchesSchema.safeParse(body);

    if (!parsed.success) {
      logger.app.warn(
        { fromBatchId, assetId, body, errors: parsed.error.flatten() },
        "Invalid input for asset move"
      );
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (fromBatchId === parsed.data.toBatchId) {
      logger.app.warn(
        { fromBatchId, toBatchId: parsed.data.toBatchId, assetId },
        "Source and destination batches are the same"
      );
      return NextResponse.json(
        { error: "Source and destination batches cannot be the same" },
        { status: 400 }
      );
    }

    const result = await moveAssetBetweenBatches(
      fromBatchId,
      parsed.data.toBatchId,
      assetId
    );

    logger.app.info(
      { fromBatchId, toBatchId: parsed.data.toBatchId, assetId },
      "Asset moved between batches successfully"
    );
    return NextResponse.json(result);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    logger.app.error(
      { error: err, errorMessage },
      "Failed to move asset between batches"
    );
    return handleApiError(err);
  }
}
