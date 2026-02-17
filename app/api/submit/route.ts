import { createId } from "@paralleldrive/cuid2";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getOffer } from "@/features/admin/services/offer.service";
import { db } from "@/lib/db";
import { creativeRequests, creatives } from "@/lib/schema";
import { generateTrackingCode } from "@/lib/utils/tracking";

const fileSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  url: z.string(),
  size: z.number(),
  type: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const submitSchema = z.object({
  affiliateId: z.string().min(1),
  companyName: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  telegramId: z.string().optional(),
  offerId: z.string().min(1),
  creativeType: z.string().min(1),
  fromLines: z.string().optional(),
  subjectLines: z.string().optional(),
  additionalNotes: z.string().optional(),
  priority: z.string().optional(),
  files: z.array(fileSchema).optional(),
});

function countLines(text: string | undefined): number {
  if (!text || text.trim() === "") return 0;
  return text.split("\n").filter((line) => line.trim() !== "").length;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = submitSchema.safeParse(body);

    if (!parsed.success) {
      console.error(
        "Validation error:",
        JSON.stringify(parsed.error.flatten(), null, 2)
      );
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten(),
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const offer = await getOffer(data.offerId);

    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    const publisherName = `${data.firstName} ${data.lastName}`;
    const publisherId = data.affiliateId;

    let fromLinesCount = countLines(data.fromLines);
    let subjectLinesCount = countLines(data.subjectLines);

    if (data.files && data.files.length > 0) {
      data.files.forEach((file) => {
        if (file.metadata) {
          const metadata = file.metadata as Record<string, unknown>;
          if (typeof metadata.fromLines === "string") {
            fromLinesCount += countLines(metadata.fromLines);
          }
          if (typeof metadata.subjectLines === "string") {
            subjectLinesCount += countLines(metadata.subjectLines);
          }
        }
      });
    }

    const priority =
      data.priority === "high" ? "High Priority" : "Medium Priority";
    const trackingCode = generateTrackingCode();

    const [request] = await db
      .insert(creativeRequests)
      .values({
        offerId: data.offerId,
        offerName: offer.offerName,
        creativeType: data.creativeType,
        creativeCount: data.files?.length || 1,
        fromLinesCount,
        subjectLinesCount,
        publisherId,
        publisherName,
        email: data.email,
        telegramId: data.telegramId || null,
        advertiserId: offer.advertiserId || "",
        advertiserName: offer.advName || "",
        affiliateId: data.affiliateId,
        clientId: data.affiliateId,
        clientName: data.companyName,
        priority,
        trackingCode,
        status: "new",
        approvalStage: "admin",
        adminStatus: "pending",
        fromLines: data.fromLines,
        subjectLines: data.subjectLines,
        additionalNotes: data.additionalNotes,
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: creativeRequests.id });

    if (data.files && data.files.length > 0) {
      const creativeRecords = data.files.map((file) => ({
        id: createId(),
        requestId: request.id,
        name: file.name,
        url: file.url,
        type: file.type,
        size: file.size,
        format: file.type.includes("image")
          ? "image"
          : file.type.includes("html")
            ? "html"
            : "other",
        status: "pending",
        metadata: file.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await db.insert(creatives).values(creativeRecords);
    }

    return NextResponse.json(
      { success: true, requestId: request.id, trackingCode },
      { status: 201 }
    );
  } catch (error) {
    console.error("Submit error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
