import { eq } from "drizzle-orm";
import { headers as getHeaders } from "next/headers";
import { NextResponse } from "next/server";

import { logStatusChange } from "@/features/admin/services/statusHistory.service";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { creativeRequests, creatives } from "@/lib/schema";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headers = await getHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session || !["admin", "administrator"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await _req.json();
    const feedbackMessage = body.reason || body.feedback;

    if (!feedbackMessage) {
      return NextResponse.json(
        { error: "Feedback is required" },
        { status: 400 }
      );
    }

    const existingRequest = await db.query.creativeRequests.findFirst({
      where: eq(creativeRequests.id, id),
      columns: { status: true },
    });

    if (!existingRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    await db
      .update(creativeRequests)
      .set({
        status: "sent-back",
        adminStatus: "rejected",
        adminComments: feedbackMessage,
        updatedAt: new Date(),
      })
      .where(eq(creativeRequests.id, id));

    await db
      .update(creatives)
      .set({ status: "sent-back", updatedAt: new Date() })
      .where(eq(creatives.requestId, id));

    await logStatusChange({
      requestId: id,
      fromStatus: existingRequest.status,
      toStatus: "sent-back",
      actorRole: "admin",
      actorId: session.user.id,
      reason: feedbackMessage,
    });

    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to return request" },
      { status: 500 }
    );
  }
}
