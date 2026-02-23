import { headers } from "next/headers";
import { NextResponse } from "next/server";

import {
  getBatch,
  getBatchWithAssets,
  updateBatch,
  deactivateBatch,
  deleteBatch,
} from "@/features/admin/services/batch.service";
import { handleApiError } from "@/lib/api-utils";
import { auth } from "@/lib/auth";
import { getRateLimitKey } from "@/lib/getRateLimitKey";
import { logger } from "@/lib/logger";
import { ratelimit } from "@/lib/ratelimit";
import { updateBatchSchema } from "@/lib/validations/admin";

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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin())) {
    logger.app.warn({}, "Unauthorized batch get request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    if (!id || typeof id !== "string" || id.trim().length === 0) {
      logger.app.warn({ batchId: id }, "Invalid batch ID in GET request");
      return NextResponse.json({ error: "Invalid batch ID" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const includeAssets = searchParams.get("includeAssets") === "true";

    if (includeAssets) {
      const batch = await getBatchWithAssets(id);
      if (!batch) {
        logger.app.warn({ batchId: id }, "Batch not found with assets");
        return NextResponse.json({ error: "Batch not found" }, { status: 404 });
      }
      logger.app.info(
        { batchId: id, assetCount: batch.assets?.length || 0 },
        "Batch retrieved with assets"
      );
      return NextResponse.json(batch);
    }

    const batch = await getBatch(id);
    if (!batch) {
      logger.app.warn({ batchId: id }, "Batch not found");
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }
    logger.app.info({ batchId: id }, "Batch retrieved");
    return NextResponse.json(batch);
  } catch (err: unknown) {
    logger.app.error({ error: err }, "Failed to get batch");
    return handleApiError(err);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin())) {
    logger.app.warn({}, "Unauthorized batch update request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rl = await enforceRateLimit();
    if (rl) {
      logger.app.warn({}, "Rate limit exceeded for batch update");
      return rl;
    }

    const { id } = await params;

    if (!id || typeof id !== "string" || id.trim().length === 0) {
      logger.app.warn({ batchId: id }, "Invalid batch ID in PUT request");
      return NextResponse.json({ error: "Invalid batch ID" }, { status: 400 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      logger.app.warn(
        { error: parseError, batchId: id },
        "Invalid JSON body in batch update request"
      );
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = updateBatchSchema.safeParse(body);

    if (!parsed.success) {
      logger.app.warn(
        { batchId: id, body, errors: parsed.error.flatten() },
        "Invalid input for batch update"
      );
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const row = await updateBatch(id, parsed.data);
    if (!row) {
      logger.app.warn({ batchId: id }, "Batch not found for update");
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }
    logger.app.info(
      { batchId: id, updates: parsed.data },
      "Batch updated successfully"
    );
    return NextResponse.json(row);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    logger.app.error({ error: err, errorMessage }, "Failed to update batch");
    return handleApiError(err);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin())) {
    logger.app.warn({}, "Unauthorized batch delete request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rl = await enforceRateLimit();
    if (rl) {
      logger.app.warn({}, "Rate limit exceeded for batch delete");
      return rl;
    }

    const { id } = await params;

    if (!id || typeof id !== "string" || id.trim().length === 0) {
      logger.app.warn({ batchId: id }, "Invalid batch ID in DELETE request");
      return NextResponse.json({ error: "Invalid batch ID" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const deactivate = searchParams.get("deactivate") === "true";

    if (deactivate) {
      const batch = await deactivateBatch(id);
      if (!batch) {
        logger.app.warn({ batchId: id }, "Batch not found for deactivation");
        return NextResponse.json({ error: "Batch not found" }, { status: 404 });
      }
      logger.app.info({ batchId: id }, "Batch deactivated successfully");
      return NextResponse.json(batch);
    }

    const deleted = await deleteBatch(id);
    if (!deleted) {
      logger.app.warn({ batchId: id }, "Batch not found for deletion");
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }
    logger.app.info({ batchId: id }, "Batch deleted successfully");
    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    logger.app.error(
      { error: err, errorMessage },
      "Failed to delete/deactivate batch"
    );
    return handleApiError(err);
  }
}
