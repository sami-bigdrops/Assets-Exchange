import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { sendBackRequest } from "@/features/admin/services/request.service";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const feedback =
      typeof body?.feedback === "string" ? body.feedback.trim() : "";

    await sendBackRequest(id, session.user.id, feedback);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("Return request error:", error);
    if (message === "Request not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message === "Invalid state transition") {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
