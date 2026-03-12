import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { creativeMetadata, creatives } from "@/lib/schema";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const creativeIdParam = searchParams.get("creativeId");

    if (!creativeIdParam) {
      return NextResponse.json(
        { success: false, error: "creativeId is required" },
        { status: 400 }
      );
    }

    // Helper to build the response from a creativeMetadata row
    function buildFromMetadataRow(record: (typeof result)[number]) {
      return NextResponse.json({
        success: true,
        metadata: {
          fromLines: record.fromLines ?? undefined,
          subjectLines: record.subjectLines ?? undefined,
          proofreadingData: record.proofreadingData ?? undefined,
          htmlContent: record.htmlContent ?? undefined,
          additionalNotes: record.additionalNotes ?? undefined,
          metadata: record.metadata ?? undefined,
        },
      });
    }

    const result = await db
      .select()
      .from(creativeMetadata)
      .where(eq(creativeMetadata.creativeId, creativeIdParam))
      .limit(1);

    if (result.length > 0) {
      return buildFromMetadataRow(result[0]);
    }

    // creativeIdParam may be a DB CUID — look up the creative's blob URL and
    // retry so we can find metadata saved by the publisher (who used blob URL).
    const [creativeRow] = await db
      .select({ url: creatives.url, metadata: creatives.metadata })
      .from(creatives)
      .where(eq(creatives.id, creativeIdParam))
      .limit(1);

    if (creativeRow?.url) {
      const byUrl = await db
        .select()
        .from(creativeMetadata)
        .where(eq(creativeMetadata.creativeId, creativeRow.url))
        .limit(1);

      if (byUrl.length > 0) {
        return buildFromMetadataRow(byUrl[0]);
      }
    }

    // Last resort: use the metadata column stored on the creatives row
    if (creativeRow?.metadata) {
      const meta = creativeRow.metadata as Record<string, unknown>;

      let fallbackProofreadingData = meta.proofreadingData;

      if (
        !fallbackProofreadingData &&
        (meta.ai_issues || meta.ai_score || meta.ai_status)
      ) {
        let qualityScore = meta.ai_score;
        if (typeof qualityScore === "number") {
          qualityScore = {
            grammar: qualityScore,
            readability: qualityScore,
            conversion: qualityScore,
            brandAlignment: qualityScore,
          };
        }

        fallbackProofreadingData = {
          issues: meta.ai_issues || [],
          qualityScore: qualityScore || undefined,
          status: meta.ai_status || "completed",
          success: true,
        };
      }

      return NextResponse.json({
        success: true,
        metadata: {
          fromLines: meta.fromLines ?? undefined,
          subjectLines: meta.subjectLines ?? undefined,
          additionalNotes: meta.additionalNotes ?? undefined,
          proofreadingData: fallbackProofreadingData ?? undefined,
        },
      });
    }

    return NextResponse.json({
      success: false,
      metadata: undefined,
    });
  } catch (error) {
    console.error("Error getting creative metadata:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get creative metadata" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      creativeId,
      fromLines,
      subjectLines,
      proofreadingData,
      htmlContent,
      additionalNotes,
      metadata,
    } = body;

    if (!creativeId) {
      return NextResponse.json(
        { success: false, error: "creativeId is required" },
        { status: 400 }
      );
    }

    await db
      .insert(creativeMetadata)
      .values({
        creativeId,
        fromLines: fromLines || null,
        subjectLines: subjectLines || null,
        proofreadingData: proofreadingData || null,
        htmlContent: htmlContent || null,
        additionalNotes: additionalNotes || null,
        metadata: metadata || null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: creativeMetadata.creativeId,
        set: {
          fromLines: fromLines ?? null,
          subjectLines: subjectLines ?? null,
          proofreadingData: proofreadingData ?? null,
          htmlContent: htmlContent ?? null,
          additionalNotes: additionalNotes ?? null,
          metadata: metadata ?? null,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Error saving creative metadata:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save creative metadata" },
      { status: 500 }
    );
  }
}
