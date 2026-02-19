import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { bulkUpdateOffers } from "@/features/admin/services/offer.service";
import { auth } from "@/lib/auth";
import { saveBuffer } from "@/lib/fileStorage";
import { getRateLimitKey } from "@/lib/getRateLimitKey";
import { ratelimit } from "@/lib/ratelimit";

async function enforceRateLimit() {
  const key = await getRateLimitKey();
  const { success } = await ratelimit.limit(key);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
}

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function POST(req: Request) {
  try {
    const rl = await enforceRateLimit();
    if (rl) return rl;

    const session = await requireAdmin();
    const formData = await req.formData();

    const offerIdsStr = formData.get("offerIds") as string;
    if (!offerIdsStr)
      return NextResponse.json({ error: "Missing offerIds" }, { status: 400 });

    const offerIds = JSON.parse(offerIdsStr) as string[];
    const visibility = formData.get("visibility") as
      | "Public"
      | "Internal"
      | "Hidden"
      | null;
    const brandGuidelinesType = formData.get("brandGuidelinesType") as
      | string
      | null;
    const brandGuidelinesNotes = formData.get("brandGuidelinesNotes") as
      | string
      | null;

    const updates: {
      visibility?: "Public" | "Internal" | "Hidden";
      brandGuidelines?: {
        type: "url" | "file" | "text" | null;
        url?: string;
        fileUrl?: string;
        fileName?: string;
        text?: string;
        notes?: string;
        attachedAt: string;
        attachedBy: string;
      } | null;
    } = {};

    if (visibility) {
      updates.visibility = visibility;
    }

    if (brandGuidelinesType) {
      const brandGuidelines: {
        type: "url" | "file" | "text" | null;
        url?: string;
        fileUrl?: string;
        fileName?: string;
        text?: string;
        notes?: string;
        attachedAt: string;
        attachedBy: string;
      } = {
        type: brandGuidelinesType as "url" | "file" | "text" | null,
        notes: brandGuidelinesNotes || undefined,
        attachedAt: new Date().toISOString(),
        attachedBy: session.user.id,
      };

      if (brandGuidelinesType === "url") {
        const url = formData.get("brandGuidelinesUrl") as string | null;
        if (url) brandGuidelines.url = url;
      } else if (brandGuidelinesType === "text") {
        const text = formData.get("brandGuidelinesText") as string | null;
        if (text) brandGuidelines.text = text;
      } else if (brandGuidelinesType === "file") {
        const file = formData.get("brandGuidelinesFile") as File | null;
        if (file && file.size > 0) {
          const buffer = Buffer.from(await file.arrayBuffer());
          const saved = await saveBuffer(buffer, file.name);
          brandGuidelines.fileUrl = saved.url;
          brandGuidelines.fileName = saved.fileName;
        } else {
          const fileUrl = formData.get("brandGuidelinesFileUrl") as string | null;
          const fileName = formData.get("brandGuidelinesFileName") as
            | string
            | null;
          if (fileUrl) brandGuidelines.fileUrl = fileUrl;
          if (fileName) brandGuidelines.fileName = fileName;
        }
      }

      updates.brandGuidelines = brandGuidelines;
    }

    const result = await bulkUpdateOffers(offerIds, updates);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    if (message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
