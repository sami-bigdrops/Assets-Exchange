import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import {
  listOffers,
  createOffer,
} from "@/features/admin/services/offer.service";
import { handleApiError } from "@/lib/api-utils";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRateLimitKey } from "@/lib/getRateLimitKey";
import { ratelimit } from "@/lib/ratelimit";
import { advertisers } from "@/lib/schema";
import { createOfferSchema } from "@/lib/validations/admin";

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
  if (!session || !["admin", "advertiser"].includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? undefined;
  const status = searchParams.get("status") as
    | "Active"
    | "Inactive"
    | undefined;

  let advertiserId: string | undefined = undefined;

  if (session.user.role === "advertiser") {
    const [advertiser] = await db
      .select()
      .from(advertisers)
      .where(eq(advertisers.contactEmail, session.user.email));
    advertiserId = advertiser?.id ?? session.user.id;
  }

  try {
    const data = await listOffers({ search, status, advertiserId });
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
    const parsed = createOfferSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const row = await createOffer(parsed.data);
    return NextResponse.json(row, { status: 201 });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
