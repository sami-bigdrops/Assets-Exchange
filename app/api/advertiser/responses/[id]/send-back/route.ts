import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { sendBackResponse } from "@/features/advertiser/services/response.service";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { advertisers } from "@/lib/schema";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;
    const body = await req.json();
    if (!body?.reason) {
      return NextResponse.json({ error: "Missing reason" }, { status: 400 });
    }

    await sendBackResponse(id, advertiser.id, body.reason);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("Send back response error:", error);
    if (message === "Request not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (message === "Invalid state transition") {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
