import { eq, desc } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { annotations } from "@/lib/schema";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ creativeId: string }> }
) {
  try {
    const { creativeId } = await params;
    if (!creativeId) {
      return NextResponse.json(
        { error: "Creative ID is required" },
        { status: 400 }
      );
    }

    const results = await db
      .select()
      .from(annotations)
      .where(eq(annotations.creativeId, creativeId))
      .orderBy(desc(annotations.createdAt));

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error("Fetch public annotations error:", error);
    return NextResponse.json(
      { error: "Failed to fetch annotations" },
      { status: 500 }
    );
  }
}
