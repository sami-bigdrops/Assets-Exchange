import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getRecentActivityForPublisher } from "@/features/publisher/services/recentActivity.services";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const publisherId = searchParams.get("publisherId");

    if (!publisherId) {
      return NextResponse.json(
        { error: "publisherId is required" },
        { status: 400 }
      );
    }

    const userPublisherId = (session.user as { publisherId?: string })
      .publisherId;
    if (
      session.user.role === "publisher" &&
      userPublisherId != null &&
      userPublisherId !== publisherId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const activity = await getRecentActivityForPublisher(publisherId);

    return NextResponse.json({
      data: activity,
    });
  } catch (error) {
    console.error("Recent activity error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
