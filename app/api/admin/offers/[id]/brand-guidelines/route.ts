import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

import {
  attachOfferBrandGuidelines,
  attachBrandGuidelines,
  detachBrandGuidelines,
  getOfferBrandGuidelines,
} from "@/features/admin/services/brandGuidelines.service";
import { auth } from "@/lib/auth";
import { getRateLimitKey } from "@/lib/getRateLimitKey";
import { validateRequest } from "@/lib/middleware/validateRequest";
import { ratelimit } from "@/lib/ratelimit";
import { brandGuidelinesSchema } from "@/lib/validations/admin";

// ---------- Rate Limit & Admin Helpers ----------
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

// ---------- GET ----------
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const brandGuidelines = await getOfferBrandGuidelines(id);

    return NextResponse.json({ success: true, data: brandGuidelines });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---------- POST ----------
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = await enforceRateLimit();
    if (rl) return rl;

    const { id } = await params;
    const session = await requireAdmin();

    const body = await req.json();

    if (!body.fileId) {
      return NextResponse.json({ error: "Missing fileId" }, { status: 400 });
    }

    await attachBrandGuidelines(id, body.fileId, session.user.id);

    return new NextResponse(null, { status: 204 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// ---------- PUT ----------
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = await enforceRateLimit();
    if (rl) return rl;

    const { id } = await params;
    const session = await requireAdmin();

    // Validate body using generic helper
    const validation = await validateRequest(req, brandGuidelinesSchema);
    if ("response" in validation) return validation.response;

    const data = validation.data;

    await attachOfferBrandGuidelines(
      id,
      { ...data, type: data.type ?? "text" },
      session.user.id
    );
    return new NextResponse(null, { status: 204 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// ---------- DELETE ----------
export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = await enforceRateLimit();
    if (rl) return rl;

    const { id } = await params;
    await requireAdmin();
    await detachBrandGuidelines(id);

    return new NextResponse(null, { status: 204 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
