import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { bulkUpdateOffers } from "@/features/admin/services/offer.service";
import { auth } from "@/lib/auth";
import { getRateLimitKey } from "@/lib/getRateLimitKey";
import { ratelimit } from "@/lib/ratelimit";
import {
  sanitizePlainText,
  sanitizeRichTextOrHtml,
} from "@/lib/security/sanitize";
import { bulkUpdateOffersSchema } from "@/lib/validations/admin";

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
    const visibility = formData.get("visibility") as string | null;
    const status = formData.get("status") as string | null;

    // HIGHLIGHT: Validation Integration
    const rawOfferIds = offerIdsStr ? JSON.parse(offerIdsStr) : [];
    const validation = bulkUpdateOffersSchema.safeParse({
      offerIds: rawOfferIds,
      visibility: visibility || undefined,
      status: status || undefined,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { offerIds } = validation.data;

    const brandGuidelinesType = formData.get("brandGuidelinesType") as
      | string
      | null;

    // HIGHLIGHT: Sanitization of free text fields
    const brandGuidelinesNotes = sanitizePlainText(
      formData.get("brandGuidelinesNotes")
    );
    const brandGuidelinesText = sanitizeRichTextOrHtml(
      formData.get("brandGuidelinesText")
    );

    const updates: {
      visibility?: "Public" | "Internal" | "Hidden";
      status?: "Active" | "Inactive";
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

    if (validation.data.visibility) {
      updates.visibility = validation.data.visibility;
    }

    if (validation.data.status) {
      updates.status = validation.data.status;
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
        if (brandGuidelinesText) brandGuidelines.text = brandGuidelinesText;
      } else if (brandGuidelinesType === "file") {
        const fileUrl = formData.get("brandGuidelinesFileUrl") as string | null;
        const fileName = formData.get("brandGuidelinesFileName") as
          | string
          | null;
        if (fileUrl) brandGuidelines.fileUrl = fileUrl;
        if (fileName) brandGuidelines.fileName = fileName;
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
