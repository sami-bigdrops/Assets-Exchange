import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { db } from "@/lib/db";
import { creativeRequests, creatives } from "@/lib/schema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId, newCreatives, metadata } = body;

    if (!requestId || !newCreatives || !Array.isArray(newCreatives)) {
      return NextResponse.json(
        { error: "Request ID and new creatives are required" },
        { status: 400 }
      );
    }

    // Verify the request exists and is in sent-back status
    const existingRequest = await db.query.creativeRequests.findFirst({
      where: eq(creativeRequests.id, requestId),
    });

    if (!existingRequest) {
      return NextResponse.json(
        { error: "Creative request not found" },
        { status: 404 }
      );
    }

    if (existingRequest.status.toLowerCase() !== "sent-back") {
      return NextResponse.json(
        { error: "Only sent-back requests can be revised" },
        { status: 400 }
      );
    }

    // Mark old creatives as superseded instead of deleting them
    // This maintains a history of all creative versions
    await db
      .update(creatives)
      .set({
        status: "superseded",
        updatedAt: new Date(),
      })
      .where(eq(creatives.requestId, requestId));

    // Insert new creatives
    const creativesToInsert = newCreatives.map(
      (creative: {
        name: string;
        url: string;
        type: string;
        size: number;
      }) => ({
        requestId,
        name: creative.name,
        url: creative.url,
        type: creative.type,
        size: creative.size,
        format: creative.name.split(".").pop() || "",
        status: "pending",
      })
    );

    await db.insert(creatives).values(creativesToInsert);

    // Update request status to revised (admin review) and save metadata
    // Using "revised" status so admin can see this is a resubmission
    await db
      .update(creativeRequests)
      .set({
        status: "revised",
        approvalStage: "admin",
        adminStatus: "pending",
        adminComments: null,
        updatedAt: new Date(),
        ...(metadata && {
          fromLines: metadata.fromLines || null,
          subjectLines: metadata.subjectLines || null,
          additionalNotes: metadata.additionalNotes || null,
        }),
      })
      .where(eq(creativeRequests.id, requestId));

    return NextResponse.json({
      success: true,
      message: "Creative request revised successfully",
    });
  } catch (error) {
    console.error("Error revising creative request:", error);
    return NextResponse.json(
      {
        error: "Failed to revise creative request",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
