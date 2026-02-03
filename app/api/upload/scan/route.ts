import { NextResponse } from "next/server";

import { scanFileByUrl } from "@/lib/services/malware-scan.service";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const fileUrl = body?.fileUrl ?? body?.file_url;

    if (!fileUrl || typeof fileUrl !== "string") {
      return NextResponse.json(
        { error: "fileUrl is required" },
        { status: 400 }
      );
    }

    if (!process.env.PYTHON_SERVICE_URL) {
      return NextResponse.json({
        scanStatus: "skipped",
        scanInfo: "Malware scan service not configured",
      });
    }

    const result = await scanFileByUrl(fileUrl);
    return NextResponse.json({
      scanStatus: result.status,
      scanInfo: result.status !== "clean" ? result.info : undefined,
    });
  } catch (e) {
    console.error("Scan request error:", e);
    return NextResponse.json(
      {
        scanStatus: "error",
        scanInfo: e instanceof Error ? e.message : "Scan failed",
      },
      { status: 200 }
    );
  }
}
