import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { creativeRequests } from "@/lib/schema";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const trackingId = searchParams.get("id");
    const trackingCode = searchParams.get("code");

    if (!trackingId && !trackingCode) {
      return NextResponse.json(
        { error: "Tracking Code or ID is required" },
        { status: 400 }
      );
    }

    // Normalize tracking code to uppercase (codes are generated uppercase)
    const normalizedCode = trackingCode?.trim().toUpperCase() || null;

    const requestData = await db.query.creativeRequests.findFirst({
      where: normalizedCode
        ? eq(creativeRequests.trackingCode, normalizedCode)
        : eq(creativeRequests.id, trackingId!),
      with: {
        creatives: true,
      },
    });

    if (!requestData) {
      return NextResponse.json(
        { error: "Request not found. Please check your Tracking ID." },
        { status: 404 }
      );
    }

    const safePayload = {
      id: requestData.id,
      offerName: requestData.offerName,
      offerId: requestData.offerId,
      status: requestData.status,
      approvalStage: requestData.approvalStage,
      adminStatus: requestData.adminStatus,
      adminComments: requestData.adminComments || null,
      submittedAt: requestData.submittedAt,
      updatedAt: requestData.updatedAt,
      trackingCode: requestData.trackingCode || "",
      priority: requestData.priority,
      creativeType: requestData.creativeType,
      fromLinesCount: requestData.fromLinesCount,
      subjectLinesCount: requestData.subjectLinesCount,
      fromLines: requestData.fromLines || null,
      subjectLines: requestData.subjectLines || null,
      additionalNotes: requestData.additionalNotes || null,
      files: requestData.creatives.map((file) => ({
        id: file.id,
        name: file.name,
        url: file.url,
        status: file.status,
        type: file.type,
      })),
    };

    return NextResponse.json({ success: true, data: safePayload });
  } catch (error) {
    console.error("Tracking API Error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve tracking data" },
      { status: 500 }
    );
  }
}
