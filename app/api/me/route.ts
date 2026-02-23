import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { publishers } from "@/lib/schema";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [publisher] = await db
    .select({
      telegramId: publishers.telegramId,
      telegramChatId: publishers.telegramChatId,
    })
    .from(publishers)
    .where(eq(publishers.contactEmail, session.user.email ?? ""))
    .limit(1);

  // const hasConnectedTelegram =
  //   !!publisher?.telegramId &&
  //   publisher.telegramId.trim() !== "" &&
  //   publisher.telegramId !== "@";
  const hasConnectedTelegram =
    !!publisher?.telegramChatId &&
    String(publisher.telegramChatId).trim() !== "";

  // return NextResponse.json({
  //   user: session.user,
  //   telegramId: publisher?.telegramId ?? null,
  //   hasConnectedTelegram,
  // });
  return NextResponse.json({
    user: session.user,
    telegramId: publisher?.telegramId ?? null,
    telegramChatId: publisher?.telegramChatId ?? null,
    hasConnectedTelegram,
  });
}
