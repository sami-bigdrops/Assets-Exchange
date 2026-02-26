import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import {
  getAdvertiserResponses,
  approveResponse,
  rejectResponse,
} from "@/features/advertiser/services/response.service";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { advertisers } from "@/lib/schema";
import { sanitizePlainText } from "@/lib/security/sanitize";
import { advertiserResponseSchema } from "@/lib/validations/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "advertiser") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const advertiser = await db.query.advertisers.findFirst({
    where: eq(advertisers.contactEmail, session.user.email),
  });

  if (!advertiser) {
    return NextResponse.json(
      { error: "Advertiser profile not found" },
      { status: 404 }
    );
  }

  const advertiserId = advertiser.id;

  try {
    const { searchParams } = new URL(req.url);

    const page = Number(searchParams.get("page") ?? 1);
    const limit = Number(searchParams.get("limit") ?? 20);
    const status = searchParams.get("status")?.split(",");
    const search = searchParams.get("search") ?? undefined;

    const result = await getAdvertiserResponses({
      advertiserId,
      page,
      limit,
      status,
      search,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("Get advertiser responses error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "advertiser") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const advertiser = await db.query.advertisers.findFirst({
    where: eq(advertisers.contactEmail, session.user.email),
  });

  if (!advertiser) {
    return NextResponse.json(
      { error: "Advertiser profile not found" },
      { status: 404 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const result = advertiserResponseSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { requestId, action, comments } = result.data;
    const sanitizedComments = sanitizePlainText(comments);

    if (action === "APPROVE") {
      await approveResponse(requestId, advertiser.id);
    } else if (action === "REJECT") {
      if (!sanitizedComments) {
        return NextResponse.json(
          { error: "Comments are required for rejection" },
          { status: 400 }
        );
      }
      await rejectResponse(requestId, advertiser.id, sanitizedComments);
    }

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("Post advertiser response error:", error);

    if (message === "Request not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message === "Invalid state transition") {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
