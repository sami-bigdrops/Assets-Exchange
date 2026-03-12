import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { publishers } from "@/lib/schema";

//changed
async function saveTelegramIdToPublisher(
  telegramId: string,
  chatId: string | undefined,
  email?: string
) {
  try {
    const normalizedTelegramId = telegramId.toLowerCase().trim();

    if (email) {
      const existingPublishers = await db
        .select()
        .from(publishers)
        .where(eq(publishers.contactEmail, email))
        .limit(1);

      if (existingPublishers.length > 0) {
        const publisher = existingPublishers[0];
        await db
          .update(publishers)
          .set({
            telegramId: normalizedTelegramId,
            //changed
            telegramChatId: chatId ?? null,
            updatedAt: new Date(),
          })
          .where(eq(publishers.id, publisher.id));
        return;
      }
    }

    const existingByTelegram = await db
      .select()
      .from(publishers)
      .where(eq(publishers.telegramId, normalizedTelegramId))
      .limit(1);

    if (existingByTelegram.length > 0) {
      const publisher = existingByTelegram[0];
      await db
        .update(publishers)
        .set({
          ...(chatId != null && { telegramChatId: chatId }),
          ...(email && !publisher.contactEmail && { contactEmail: email }),
          updatedAt: new Date(),
        })
        .where(eq(publishers.id, publisher.id));
      return;
    }

    await db.insert(publishers).values({
      name: `Publisher ${normalizedTelegramId}`,
      telegramId: normalizedTelegramId,
      //changed
      telegramChatId: chatId ?? null,
      contactEmail: email || null,
      status: "active",
    });
  } catch (error) {
    console.error("Error saving telegramId to publisher:", error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { telegramId, email } = body;

    if (!telegramId || typeof telegramId !== "string") {
      return NextResponse.json(
        { error: "Telegram ID is required" },
        { status: 400 }
      );
    }

    const normalizedTelegramId = telegramId.toLowerCase().trim();

    if (!normalizedTelegramId.startsWith("@")) {
      return NextResponse.json(
        { error: "Invalid Telegram ID format" },
        { status: 400 }
      );
    }

    const verificationKey = `telegram_verify:${normalizedTelegramId}`;
    const verificationData = await redis.get(verificationKey);

    let parsed: { verified?: boolean; verifiedAt?: string; chatId?: string } = {
      verified: false,
    };
    if (verificationData) {
      if (typeof verificationData === "string") {
        try {
          parsed = JSON.parse(verificationData);
        } catch {
          parsed = { verified: false };
        }
      } else if (typeof verificationData === "object") {
        parsed = verificationData as {
          verified?: boolean;
          verifiedAt?: string;
          chatId?: string;
        };
      }
    }

    if (parsed.verified === true && parsed.chatId) {
      await saveTelegramIdToPublisher(
        normalizedTelegramId,
        parsed.chatId,
        email
      );
      const [updated] = await db
        .select({ updatedAt: publishers.updatedAt })
        .from(publishers)
        .where(eq(publishers.telegramId, normalizedTelegramId))
        .limit(1);
      return NextResponse.json({
        verified: true,
        verifiedAt: updated?.updatedAt?.toISOString() ?? parsed.verifiedAt,
        savedInDb: true,
      });
    }

    const existingPublisher = await db
      .select()
      .from(publishers)
      .where(eq(publishers.telegramId, normalizedTelegramId))
      .limit(1);

    if (existingPublisher.length > 0) {
      if (existingPublisher[0].telegramChatId) {
        return NextResponse.json({
          verified: true,
          verifiedAt:
            existingPublisher[0].updatedAt?.toISOString() ||
            existingPublisher[0].createdAt?.toISOString(),
          savedInDb: true,
        });
      }
      return NextResponse.json({
        verified: false,
        savedInDb: true,
        message: "Send /start to the bot in Telegram, then click Verify again.",
      });
    }

    return NextResponse.json({ verified: false, savedInDb: false });
  } catch (error) {
    console.error("Error verifying Telegram ID:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
