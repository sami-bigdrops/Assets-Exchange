import { and, asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { creativeRequests, creatives } from "@/lib/schema";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const [requestRow] = await db
      .select()
      .from(creativeRequests)
      .where(
        and(
          eq(creativeRequests.id, id),
          eq(creativeRequests.publisherId, session.user.id)
        )
      )
      .limit(1);

    if (!requestRow) {
      return NextResponse.json(
        { error: "Request not found or unauthorized" },
        { status: 404 }
      );
    }

    if (requestRow.status !== "sent-back") {
      return NextResponse.json(
        { error: "Request is not available for edit" },
        { status: 409 }
      );
    }

    const creativeRows = await db
      .select({
        id: creatives.id,
        name: creatives.name,
        url: creatives.url,
        size: creatives.size,
        type: creatives.type,
        format: creatives.format,
        metadata: creatives.metadata,
      })
      .from(creatives)
      .where(eq(creatives.requestId, id))
      .orderBy(asc(creatives.createdAt));

    return NextResponse.json({
      request: {
        id: requestRow.id,
        adminComments: requestRow.adminComments,
        fromLines: requestRow.fromLines,
        subjectLines: requestRow.subjectLines,
        additionalNotes: requestRow.additionalNotes,
        offerId: requestRow.offerId,
        creativeType: requestRow.creativeType,
      },
      creatives: creativeRows,
    });
  } catch (error) {
    console.error("Get publisher request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
