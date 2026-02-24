import { type NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

import { saveBuffer } from "@/lib/fileStorage";
import { validateBufferMagicBytes } from "@/lib/security/validateBuffer";
import { ZipParserService } from "@/lib/services/zip-parser.service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    // 1. Download the ZIP file from Blob
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ZIP from Blob: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // 2. Process with existing ZipParserService
    const parsedEntries =
      await ZipParserService.parseAndIdentifyDependencies(fileBuffer);

    if (parsedEntries.length > 50) {
      return NextResponse.json(
        { error: "ZIP contains too many files (Limit: 50)" },
        { status: 400 }
      );
    }

    const zipId = uuidv4();
    const items: Array<{
      id: string;
      name: string;
      url: string;
      size: number;
      type: string;
      isDependency: boolean;
    }> = [];
    let imagesCount = 0;
    let htmlCount = 0;

    for (const entry of parsedEntries) {
      //validating each extracted file before saving it
      const v = await validateBufferMagicBytes(entry.content);

      if (!v.ok) {
        return NextResponse.json(
          {
            error: "ZIP contains invalid file",
            file: entry.name,
            reason: v.reason,
          },
          { status: 415 }
        );
      }

      const detectedType = v.detectedMime;

      // 3. Save extracted files to Blob (server-side)
      const saved = await saveBuffer(
        entry.content,
        entry.name.split("/").pop() || "file",
        `extracted/${zipId}`
      );

      if (detectedType.startsWith("image/")) imagesCount++;
      if (detectedType.includes("html")) htmlCount++;

      items.push({
        id: saved.id,
        name: entry.name,
        url: saved.url,
        size: entry.content.length,
        type: detectedType,
        isDependency: entry.isDependency,
      });
    }

    return NextResponse.json({
      success: true,
      zipAnalysis: {
        uploadId: zipId,
        isSingleCreative: htmlCount === 1,
        items,
        counts: { images: imagesCount, htmls: htmlCount },
        mainCreative:
          htmlCount === 1
            ? items.find((i) => i.type.includes("html"))
            : undefined,
      },
    });
  } catch (error) {
    console.error("ZIP Processing Error:", error);
    return NextResponse.json(
      {
        error: "ZIP processing failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
