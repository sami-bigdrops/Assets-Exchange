import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { bulkUpdateOffers } from "@/features/admin/services/offer.service";
import { auth } from "@/lib/auth";
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
        if (!offerIdsStr) return NextResponse.json({ error: "Missing offerIds" }, { status: 400 });

        const offerIds = JSON.parse(offerIdsStr);
        const visibility = formData.get("visibility") as "Public" | "Internal" | "Hidden";
        const brandGuidelinesType = formData.get("brandGuidelinesType") as string;
        const brandGuidelinesNotes = formData.get("brandGuidelinesNotes") as string;

        const updates: any = {};
        if (visibility) updates.visibility = visibility;

        if (brandGuidelinesType) {
            updates.brandGuidelines = {
                type: brandGuidelinesType,
                notes: brandGuidelinesNotes || undefined,
                attachedAt: new Date().toISOString(),
                attachedBy: session.user.id,
            };

            if (brandGuidelinesType === "url") {
                updates.brandGuidelines.url = formData.get("brandGuidelinesUrl");
            } else if (brandGuidelinesType === "text") {
                updates.brandGuidelines.text = formData.get("brandGuidelinesText");
            } else if (brandGuidelinesType === "file") {
                updates.brandGuidelines.fileUrl = formData.get("brandGuidelinesFileUrl");
                updates.brandGuidelines.fileName = formData.get("brandGuidelinesFileName");
            }
        }

        const result = await bulkUpdateOffers(offerIds, updates);
        return NextResponse.json(result);
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Internal server error";
        if (message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
