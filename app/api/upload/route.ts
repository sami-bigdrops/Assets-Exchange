import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

import { saveBuffer } from "@/lib/fileStorage";
import { sanitizeFilename } from "@/lib/security/route";
import { validateBufferMagicBytes } from "@/lib/security/validateBuffer";
import { ZipParserService } from "@/lib/services/zip-parser.service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let fileBuffer: Buffer;
    let fileName: string;
    let smartDetection = false;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      smartDetection = formData.get("smartDetection") === "true";

      if (!file) {
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 }
        );
      }

      fileBuffer = Buffer.from(await file.arrayBuffer());
      fileName = file.name;
    } else {
      const url = new URL(req.url);
      smartDetection = url.searchParams.get("smartDetection") === "true";

      const rawFilename = url.searchParams.get("filename") || "upload.zip";
      fileName = decodeURIComponent(rawFilename);

      fileBuffer = Buffer.from(await req.arrayBuffer());

      if (!fileBuffer || fileBuffer.length === 0) {
        return NextResponse.json({ error: "Empty file body" }, { status: 400 });
      }
    }

    //validate buffer magic bytes
    const v = await validateBufferMagicBytes(fileBuffer);

    if (!v.ok) {
      return NextResponse.json(
        { error: "Invalid file", reason: v.reason },
        { status: 415 }
      );
    }

    const isZip = v.detectedMime.includes("zip") || v.detectedExt === "zip";

    if (isZip && smartDetection) {
      const zipId = uuidv4();

      const parsedEntries =
        await ZipParserService.parseAndIdentifyDependencies(fileBuffer);

      if (parsedEntries.length > 50) {
        return NextResponse.json(
          { error: "ZIP contains too many files (Limit: 50)" },
          { status: 400 }
        );
      }

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
        //  validate actual file content
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

        const saved = await saveBuffer(
          entry.content,
          sanitizeFilename(entry.name.split("/").pop() || "file"),
          `extracted/${zipId}`
        );

        //  REPLACED: use detectedType instead of entry.type
        if (detectedType.startsWith("image/")) imagesCount++;
        if (detectedType.includes("html")) htmlCount++;

        items.push({
          id: saved.id,
          name: entry.name,
          url: saved.url,
          size: entry.content.length,
          type: detectedType, // REPLACED HERE
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
        },
      });
    }

    //change saving file ,sanititize filename+store safe type
    const safeName = sanitizeFilename(fileName);
    const saved = await saveBuffer(fileBuffer, safeName);

    return NextResponse.json({
      success: true,
      file: {
        fileId: saved.id,
        fileName: saved.fileName,
        fileUrl: saved.url,
        fileSize: saved.size,
        fileType: v.detectedMime, //changed to detected mime type
        uploadDate: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Upload Processing Error:", error);
    return NextResponse.json(
      {
        error: "Server processing failed",
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
