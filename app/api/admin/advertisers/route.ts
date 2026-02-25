import { headers } from "next/headers";
import { NextResponse } from "next/server";

import {
  listAdvertisers,
  createAdvertiser,
} from "@/features/admin/services/advertiser.service";
import { handleApiError } from "@/lib/api-utils";
import { auth } from "@/lib/auth";
import { getRateLimitKey } from "@/lib/getRateLimitKey";
import { ratelimit } from "@/lib/ratelimit";
import {
  createAdvertiserSchema,
  searchQuerySchema,
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

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || undefined;

  // Validate query parameters
  const queryParsed = searchQuerySchema.safeParse({ search });
  if (!queryParsed.success) {
    return NextResponse.json(
      {
        error: "Invalid query parameters",
        details: queryParsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  try {
    const data = await listAdvertisers({ search: queryParsed.data.search });
    return NextResponse.json({ data });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const rl = await enforceRateLimit();
    if (rl) return rl;

    const body = await req.json();
    const parsed = createAdvertiserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const row = await createAdvertiser(parsed.data);
    return NextResponse.json(row, { status: 201 });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
