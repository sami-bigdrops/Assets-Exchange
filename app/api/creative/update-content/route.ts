import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { saveBuffer } from "@/lib/fileStorage";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    let userId: string | undefined;
    try {
      const session = await auth.api.getSession({
        headers: req.headers,
      });
      userId = session?.user?.id;
    } catch (authError) {
      console.warn("Auth check skipped:", authError);
    }

    const { creativeId, content, filename } = await req.json();

    if (!creativeId || !content) {
      return NextResponse.json(
        { error: "Missing creativeId or content" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(content, "utf-8");

    const baseName = (filename || "index.html").replace(/\.html?$/i, "");
    const safeFilename = `${baseName}-${Date.now()}.html`;

    const uploadResult = await saveBuffer(
      buffer,
      safeFilename,
      "updated-creatives"
    );

    logger.info({
      action: "creative.content.updated",
      userId: userId || "anonymous",
      creativeId,
      filename: safeFilename,
      newUrl: uploadResult.url,
      size: buffer.length,
    });

    return NextResponse.json({
      success: true,
      newUrl: uploadResult.url,
      filename: safeFilename,
      size: buffer.length,
    });
  } catch (error) {
    logger.error({
      action: "creative.content.update.error",
      error: (error as Error).message,
    });
    return NextResponse.json(
      { error: "Failed to update file content" },
      { status: 500 }
    );
  }
}
