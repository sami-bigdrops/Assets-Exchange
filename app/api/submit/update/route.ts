import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { getOffer } from "@/features/admin/services/offer.service";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { creativeRequests, creatives } from "@/lib/schema";

function countLines(text: string | undefined): number {
  if (!text || text.trim() === "") return 0;
  return text.split("\n").filter((line) => line.trim() !== "").length;
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { requestId, files, formData } = body;

    if (!requestId || !files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: "Missing requestId or files" },
        { status: 400 }
      );
    }

    const [existingRequest] = await db
      .select()
      .from(creativeRequests)
      .where(
        and(
          eq(creativeRequests.id, requestId),
          eq(creativeRequests.publisherId, session.user.id)
        )
      )
      .limit(1);

    if (!existingRequest) {
      return NextResponse.json(
        { error: "Request not found or unauthorized" },
        { status: 404 }
      );
    }

    if (existingRequest.status !== "sent-back") {
      return NextResponse.json(
        { error: "Request cannot be resubmitted" },
        { status: 409 }
      );
    }

    let fromLinesCount = countLines(formData?.fromLines);
    let subjectLinesCount = countLines(formData?.subjectLines);
    files.forEach((file: { metadata?: Record<string, unknown> }) => {
      if (file.metadata) {
        if (typeof file.metadata.fromLines === "string") {
          fromLinesCount += countLines(file.metadata.fromLines);
        }
        if (typeof file.metadata.subjectLines === "string") {
          subjectLinesCount += countLines(file.metadata.subjectLines);
        }
      }
    });

    const priority =
      formData?.priority === "high" ? "High Priority" : "Medium Priority";

    let offer: Awaited<ReturnType<typeof getOffer>> = null;
    if (formData?.offerId) {
      offer = await getOffer(formData.offerId);
    }

    await db
      .update(creativeRequests)
      .set({
        status: "new",
        approvalStage: "admin",
        adminStatus: "pending",
        creativeCount: files.length,
        fromLinesCount,
        subjectLinesCount,
        updatedAt: new Date(),
        ...(offer && formData?.offerId
          ? {
              offerId: formData.offerId,
              offerName: offer.offerName,
              advertiserId: offer.advertiserId ?? "",
              advertiserName: offer.advName ?? "",
            }
          : {}),
        ...(formData
          ? {
              ...(formData.creativeType != null && {
                creativeType: formData.creativeType,
              }),
              ...(formData.fromLines != null && {
                fromLines: formData.fromLines,
              }),
              ...(formData.subjectLines != null && {
                subjectLines: formData.subjectLines,
              }),
              ...(formData.additionalNotes != null && {
                additionalNotes: formData.additionalNotes,
              }),
              ...(formData.priority != null && {
                priority: priority as "High Priority" | "Medium Priority",
              }),
            }
          : {}),
      })
      .where(eq(creativeRequests.id, requestId));

    for (const file of files) {
      if (file.id) {
        await db
          .update(creatives)
          .set({
            url: file.url,
            status: "pending",
            metadata: (file.metadata as Record<string, unknown>) ?? {},
            updatedAt: new Date(),
          })
          .where(
            and(eq(creatives.id, file.id), eq(creatives.requestId, requestId))
          );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Resubmit error:", error);
    return NextResponse.json({ error: "Failed to resubmit" }, { status: 500 });
  }
}
