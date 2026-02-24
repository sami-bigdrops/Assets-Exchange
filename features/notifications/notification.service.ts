import { eq } from "drizzle-orm";

import { sendAlert } from "@/lib/alerts";
import { db } from "@/lib/db";
import { publishers } from "@/lib/schema";

import type { WorkflowEvent } from "./types";

export async function notifyWorkflowEvent(evt: WorkflowEvent) {
  try {
    const base = `Request: ${evt.requestId}\nOffer: ${evt.offerName}`;

    let msg = "";

    switch (evt.event) {
      case "request.approved_by_admin":
        msg = `📤 *Request approved by Admin*\n${base}`;
        break;

      case "request.rejected_by_admin":
        msg = `❌ *Request rejected by Admin*\n${base}`;
        break;

      case "response.approved_by_advertiser":
        msg = `✅ *Response approved by Advertiser*\n${base}`;
        break;

      case "response.sent_back_by_advertiser":
        msg = `↩️ *Response sent back by Advertiser*\n${base}`;
        break;

      default:
        return;
    }

    await sendAlert(msg);
  } catch (err) {
    console.error("Failed to send workflow notification", err);
  }
}

export function isValidTelegramId(id: string | null | undefined): boolean {
  if (!id) return false;
  return /^-?\d+$/.test(id);
}

export async function getPublisherTelegramId(
  publisherId: string
): Promise<string | null> {
  const result = await db.query.publishers.findFirst({
    where: eq(publishers.id, publisherId),
    columns: {
      telegramId: true,
    },
  });

  return result?.telegramId ?? null;
}

// Helper to escape HTML characters
const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function sendSubmissionTelegramAlert(
  telegramId: string,
  trackingCode: string,
  campaignName: string
) {
  if (!isValidTelegramId(telegramId)) {
    console.warn(`Invalid Telegram ID for alert: ${telegramId}`);
    return;
  }

  const escapedCampaignName = escapeHtml(campaignName);

  const message =
    `🎉 <b>Submission Received!</b>\n\n` +
    `<b>Campaign:</b> ${escapedCampaignName}\n` +
    `<b>Tracking ID:</b> <code>${trackingCode}</code>\n\n` +
    `<a href="${process.env.NEXT_PUBLIC_APP_URL}/track?id=${trackingCode}">Click here to track your asset status</a>`;

  const response = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: telegramId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    }
  );

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      description?: string;
    };
    const errorMessage = errorData.description || response.statusText;
    console.error(`[TELEGRAM_FAILED] ${errorMessage}`);
    throw new Error(`Telegram API Error: ${errorMessage}`);
  }

  console.warn(`[TELEGRAM_SENT] TrackingCode: ${trackingCode}`);
}
