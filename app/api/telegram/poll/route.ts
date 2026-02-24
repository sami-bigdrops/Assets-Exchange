import { NextResponse } from "next/server";

import { env } from "@/env";
import { redis } from "@/lib/redis";

const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

async function sendMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<void> {
  try {
    await fetch(`${TELEGRAM_API_BASE}${botToken}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    });
  } catch (error) {
    console.error("Error sending Telegram message:", error);
  }
}

async function getLastUpdateId(): Promise<number> {
  const lastUpdateIdKey = "telegram:last_update_id";
  const lastId = await redis.get<number>(lastUpdateIdKey);
  return lastId || 0;
}

async function setLastUpdateId(updateId: number): Promise<void> {
  const lastUpdateIdKey = "telegram:last_update_id";
  await redis.set(lastUpdateIdKey, updateId);
}

export async function POST() {
  try {
    const botToken = env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      return NextResponse.json(
        { error: "Telegram bot token not configured" },
        { status: 500 }
      );
    }

    const lastUpdateId = await getLastUpdateId();
    const response = await fetch(
      `${TELEGRAM_API_BASE}${botToken}/getUpdates?offset=${lastUpdateId + 1}&limit=100`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      // If a webhook is active, getUpdates returns 409 Conflict.
      // We can safely ignore this since the webhook handles updates.
      if (response.status === 409) {
        return NextResponse.json({
          success: true,
          processed: 0,
          webhookActive: true,
        });
      }

      console.error("Telegram API error:", errorText);
      return NextResponse.json(
        { error: "Failed to fetch updates from Telegram" },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.ok || !data.result || data.result.length === 0) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    let maxUpdateId = lastUpdateId;
    let processedCount = 0;

    for (const update of data.result) {
      maxUpdateId = Math.max(maxUpdateId, update.update_id);

      if (update.message && update.message.text) {
        const message = update.message;
        const text = message.text.trim();
        const chat = message.chat;
        const telegramId = chat.username ? `@${chat.username}` : undefined;
        const chatId = chat.id.toString();
        const firstName = chat.first_name || "";

        if (text === "/start" || text.toLowerCase() === "/start") {
          if (telegramId) {
            const verificationKey = `telegram_verify:${telegramId.toLowerCase()}`;
            await redis.set(
              verificationKey,
              JSON.stringify({
                verified: true,
                chatId,
                verifiedAt: new Date().toISOString(),
              }),
              { ex: 3600 }
            );

            const responseText = `✔ Thanks, ${firstName || "there"}! Your Telegram is now linked. You can return to the form and click Verify.`;
            await sendMessage(botToken, chatId, responseText);
            processedCount++;
          } else {
            await sendMessage(
              botToken,
              chatId,
              "Please set a username in your Telegram account to verify your identity."
            );
          }
        }
      }
    }

    if (maxUpdateId > lastUpdateId) {
      await setLastUpdateId(maxUpdateId);
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      lastUpdateId: maxUpdateId,
    });
  } catch (error) {
    console.error("Error polling Telegram:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
