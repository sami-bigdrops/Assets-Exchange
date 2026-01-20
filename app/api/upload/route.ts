import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

import { saveBuffer } from "@/lib/fileStorage";
import { ZipParserService } from "@/lib/services/zip-parser.service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let fileBuffer: Buffer;
    let fileName: string;
    let fileType: string;
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
      fileType = file.type;
    } else {
      const url = new URL(req.url);
      smartDetection = url.searchParams.get("smartDetection") === "true";

      const rawFilename = url.searchParams.get("filename") || "upload.zip";
      fileName = decodeURIComponent(rawFilename);
      fileType = contentType || "application/octet-stream";

      fileBuffer = Buffer.from(await req.arrayBuffer());

      if (!fileBuffer || fileBuffer.length === 0) {
        return NextResponse.json({ error: "Empty file body" }, { status: 400 });
      }
    }

    const isZip = fileType.includes("zip") || /\.zip$/i.test(fileName);

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
        const saved = await saveBuffer(
          entry.content,
          entry.name.split("/").pop() || "file",
          `extracted/${zipId}`
        );

        if (entry.type.startsWith("image/")) imagesCount++;
        if (entry.type.includes("html")) htmlCount++;

        items.push({
          id: saved.id,
          name: entry.name,
          url: saved.url,
          size: entry.content.length,
          type: entry.type,
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

    const saved = await saveBuffer(fileBuffer, fileName);

    /* 🚧 SECURITY TODO: 
       The Python Malware Service integration is disabled for now.
       Uncomment the block below when the Checking Model is ready.
    */
    /*
    if (process.env.PYTHON_SERVICE_URL) {
        fetch(`${process.env.PYTHON_SERVICE_URL}/scan`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file_url: saved.url }),
        }).catch(err => console.error("Scan trigger error:", err));
    }
    */

    return NextResponse.json({
      success: true,
      file: {
        fileId: saved.id,
        fileName: saved.fileName,
        fileUrl: saved.url,
        fileSize: saved.size,
        fileType: fileType || "application/octet-stream",
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
