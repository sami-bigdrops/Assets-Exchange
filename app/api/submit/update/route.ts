import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { logStatusChange } from "@/features/admin/services/statusHistory.service";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { creativeRequests, creatives } from "@/lib/schema";

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { requestId, files } = body;

    if (!requestId || !files) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const existingRequest = await db.query.creativeRequests.findFirst({
      where: eq(creativeRequests.id, requestId),
    });

    if (!existingRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    await db
      .update(creativeRequests)
      .set({
        status: "pending",
        adminStatus: "pending",
        updatedAt: new Date(),
      })
      .where(eq(creativeRequests.id, requestId));

    for (const file of files) {
      if (file.id) {
        await db
          .update(creatives)
          .set({
            url: file.url,
            status: "pending",
            metadata: file.metadata || {},
            updatedAt: new Date(),
          })
          .where(
            and(eq(creatives.id, file.id), eq(creatives.requestId, requestId))
          );
      }
    }

    await logStatusChange({
      requestId,
      fromStatus: existingRequest.status,
      toStatus: "pending",
      actorRole: "publisher",
      actorId: session.user.id,
      reason: "Publisher resubmitted updated creatives based on feedback.",
    });

    return NextResponse.json({ success: true });
  } catch (_error) {
    console.error("Resubmit error:", _error);
    return NextResponse.json({ error: "Failed to resubmit" }, { status: 500 });
  }
}
