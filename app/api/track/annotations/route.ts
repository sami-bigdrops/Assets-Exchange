import { eq, desc } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { annotations, creatives } from "@/lib/schema";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const creativeId = searchParams.get("creativeId");
    const trackingCode = searchParams.get("trackingCode");

    if (!creativeId || !trackingCode) {
      return NextResponse.json(
        { error: "creativeId and trackingCode are required" },
        { status: 400 }
      );
    }

    const creative = await db.query.creatives.findFirst({
      where: eq(creatives.id, creativeId),
      with: {
        request: true,
      },
    });

    if (!creative || !creative.request) {
      return NextResponse.json(
        { error: "Creative not found" },
        { status: 404 }
      );
    }

    if (creative.request.trackingCode !== trackingCode) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const results = await db
      .select()
      .from(annotations)
      .where(eq(annotations.creativeId, creativeId))
      .orderBy(desc(annotations.createdAt));

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error("Public Annotations API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch annotations" },
      { status: 500 }
    );
  }
}
