import { headers } from "next/headers";
import { NextResponse } from "next/server";

import {
  getAdvertiser,
  updateAdvertiser,
  softDeleteAdvertiser,
} from "@/features/admin/services/advertiser.service";
import { auth } from "@/lib/auth";
import { getRateLimitKey } from "@/lib/getRateLimitKey";
import { ratelimit } from "@/lib/ratelimit";
import {
  sanitizePlainText,
  sanitizeRichTextOrHtml,
} from "@/lib/security/sanitize";
import { idParamSchema, updateAdvertiserSchema } from "@/lib/validations/admin";

async function enforceRateLimit() {
  const key = await getRateLimitKey();
  const { success } = await ratelimit.limit(key);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
}

async function checkAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") return false;
  return true;
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Validate ID parameter
  const paramsParsed = idParamSchema.safeParse({ id });
  if (!paramsParsed.success) {
    return NextResponse.json(
      { error: "Invalid ID", details: paramsParsed.error.flatten() },
      { status: 400 }
    );
  }

  const row = await getAdvertiser(paramsParsed.data.id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const rl = await enforceRateLimit();
    if (rl) return rl;

    const { id } = await params;

    // Validate ID parameter
    const paramsParsed = idParamSchema.safeParse({ id });
    if (!paramsParsed.success) {
      return NextResponse.json(
        { error: "Invalid ID", details: paramsParsed.error.flatten() },
        { status: 400 }
      );
    }

    const body = await req.json();

    // Validate request body
    // Note: updateAdvertiserSchema expects 'id' in the body per current schema definition
    const bodyParsed = updateAdvertiserSchema.safeParse({
      ...body,
      id: paramsParsed.data.id,
    });
    if (!bodyParsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: bodyParsed.error.flatten() },
        { status: 400 }
      );
    }

    const { id: _, ...data } = bodyParsed.data;

    // Sanitize free text fields in brand guidelines
    if (data.brandGuidelines) {
      if (data.brandGuidelines.text) {
        data.brandGuidelines.text = sanitizeRichTextOrHtml(
          data.brandGuidelines.text
        );
      }
      if (data.brandGuidelines.notes) {
        data.brandGuidelines.notes = sanitizePlainText(
          data.brandGuidelines.notes
        );
      }
    }

    const row = await updateAdvertiser(paramsParsed.data.id, data);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const rl = await enforceRateLimit();
    if (rl) return rl;

    const { id } = await params;

    // Validate ID parameter
    const paramsParsed = idParamSchema.safeParse({ id });
    if (!paramsParsed.success) {
      return NextResponse.json(
        { error: "Invalid ID", details: paramsParsed.error.flatten() },
        { status: 400 }
      );
    }

    await softDeleteAdvertiser(paramsParsed.data.id);
    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
