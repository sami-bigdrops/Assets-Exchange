import { type NextRequest, NextResponse } from "next/server";

import { rejectResponse } from "@/features/advertiser/services/response.service";
import { auth } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await req.headers });
    if (!session || session.user.role !== "advertiser") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { reason } = await req.json(); // Reason is optional for direct reject, but good to have

    await rejectResponse(
      id,
      session.user.id,
      reason || "Directly rejected by advertiser"
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to reject request:", error);
    return NextResponse.json(
      { error: "Failed to reject request" },
      { status: 500 }
    );
  }
}
