import { headers } from "next/headers";
import { NextResponse } from "next/server";

import {
  listBatches,
  createBatch,
} from "@/features/admin/services/batch.service";
import { handleApiError } from "@/lib/api-utils";
import { auth } from "@/lib/auth";
import { getRateLimitKey } from "@/lib/getRateLimitKey";
import { logger } from "@/lib/logger";
import { ratelimit } from "@/lib/ratelimit";
import {
  createBatchSchema,
  listBatchesQuerySchema,
} from "@/lib/validations/admin";

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
  return session;
}

export async function GET(req: Request) {
  const session = await checkAdmin();
  if (!session) {
    logger.app.warn({}, "Unauthorized batch list request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const queryParams = {
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") as
        | "active"
        | "inactive"
        | "archived"
        | undefined,
      createdBy: searchParams.get("createdBy") ?? undefined,
    };

    const parsed = listBatchesQuerySchema.safeParse(queryParams);
    if (!parsed.success) {
      logger.app.warn(
        { queryParams, errors: parsed.error.flatten() },
        "Invalid query parameters for batch list"
      );
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = await listBatches(parsed.data);
    logger.app.info(
      { count: data.length, filters: parsed.data },
      "Batches listed successfully"
    );
    return NextResponse.json({ data });
  } catch (err: unknown) {
    logger.app.error({ error: err }, "Failed to list batches");
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  const session = await checkAdmin();
  if (!session) {
    logger.app.warn({}, "Unauthorized batch creation request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rl = await enforceRateLimit();
    if (rl) {
      logger.app.warn(
        { userId: session.user.id },
        "Rate limit exceeded for batch creation"
      );
      return rl;
    }

    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      logger.app.warn(
        { error: parseError },
        "Invalid JSON body in batch creation request"
      );
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = createBatchSchema.safeParse({
      ...body,
      createdBy: session.user.id,
    });

    if (!parsed.success) {
      logger.app.warn(
        { body, errors: parsed.error.flatten(), userId: session.user.id },
        "Invalid input for batch creation"
      );
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const row = await createBatch(parsed.data);
    logger.app.info(
      { batchId: row.id, batchLabel: row.batchLabel, userId: session.user.id },
      "Batch created successfully"
    );
    return NextResponse.json(row, { status: 201 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    logger.app.error(
      { error: err, userId: session?.user?.id, errorMessage },
      "Failed to create batch"
    );
    return handleApiError(err);
  }
}
