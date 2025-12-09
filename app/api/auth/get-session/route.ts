import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    return NextResponse.json(session);
  } catch {
    return NextResponse.json(
      { error: "Failed to get session" },
      { status: 500 }
    );
  }
}
