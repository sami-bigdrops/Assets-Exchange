import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { getAdminRequests } from "@/features/admin/services/request.service";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);

    const page = Number(searchParams.get("page") ?? 1);
    const limit = Number(searchParams.get("limit") ?? 20);
    const statusParam = searchParams.get("status");
    const status = statusParam
      ? (statusParam.split(",") as (
          | "new"
          | "pending"
          | "approved"
          | "rejected"
          | "sent-back"
        )[])
      : undefined;
    const approvalStageParam = searchParams.get("approvalStage");
    const approvalStage = approvalStageParam
      ? (approvalStageParam as "admin" | "advertiser" | "completed")
      : undefined;
    const search = searchParams.get("search") ?? undefined;
    const sort = searchParams.get("sort") ?? undefined;

    const result = await getAdminRequests({
      page,
      limit,
      status,
      approvalStage,
      search,
      sort,
    });

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("Get requests error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
