import { createId } from "@paralleldrive/cuid2";
import { eq, desc } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { annotations } from "@/lib/schema";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const creativeId = searchParams.get("creativeId");

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
    console.error("Fetch Annotations Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch annotations" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (
      !session ||
      (session.user.role !== "admin" && session.user.role !== "advertiser")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { creativeId, positionData, content } = body;

    if (!creativeId || !positionData || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const newAnnotation = {
      id: createId(),
      creativeId,
      adminId: session.user.id,
      positionData: positionData as Record<string, number>,
      content,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(annotations).values(newAnnotation);

    return NextResponse.json({ success: true, data: newAnnotation });
  } catch (error) {
    console.error("Create Annotation Error:", error);
    return NextResponse.json(
      { error: "Failed to create annotation" },
      { status: 500 }
    );
  }
}
