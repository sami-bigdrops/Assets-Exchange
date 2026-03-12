import { eq } from "drizzle-orm";

import { sendAlert } from "@/lib/alerts";
import { db } from "@/lib/db";
import { sendEmail, isEmailConfigured } from "@/lib/email/ses";
import { creativeRequests, publishers } from "@/lib/schema";

import type { WorkflowEvent } from "./types";

const ADVERTISER_EVENTS: WorkflowEvent["event"][] = [
  "response.approved_by_advertiser",
  "response.sent_back_by_advertiser",
  "response.rejected_by_advertiser",
];

async function getPublisherEmailAndTracking(
  requestId: string
): Promise<{ email: string | null; trackingCode: string | null }> {
  const row = await db.query.creativeRequests.findFirst({
    where: eq(creativeRequests.id, requestId),
    columns: { email: true, publisherId: true, trackingCode: true },
  });
  if (!row) return { email: null, trackingCode: null };
  const requestEmail = row.email?.trim();
  if (requestEmail)
    return { email: requestEmail, trackingCode: row.trackingCode ?? null };
  const pub = await db.query.publishers.findFirst({
    where: eq(publishers.id, row.publisherId),
    columns: { contactEmail: true },
  });
  const email = pub?.contactEmail?.trim() ?? null;
  return { email, trackingCode: row.trackingCode ?? null };
}

function buildWorkflowEmailSubject(evt: WorkflowEvent): string {
  switch (evt.event) {
    case "response.approved_by_advertiser":
      return `Your creative was approved – ${evt.offerName}`;
    case "response.sent_back_by_advertiser":
      return `Creative sent back for revisions – ${evt.offerName}`;
    case "response.rejected_by_advertiser":
      return `Creative update – ${evt.offerName}`;
    default:
      return `Assets Exchange – ${evt.offerName}`;
  }
}

function buildWorkflowEmailBody(
  evt: WorkflowEvent,
  trackingCode: string | null
): { text: string; html: string } {
  const base = `Offer: ${evt.offerName}`;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const trackUrl = trackingCode
    ? `${baseUrl}/track?code=${encodeURIComponent(trackingCode)}`
    : baseUrl
      ? `${baseUrl}/track`
      : "";
  let summary = "";
  switch (evt.event) {
    case "response.approved_by_advertiser":
      summary = "Your creative has been approved by the advertiser.";
      break;
    case "response.sent_back_by_advertiser":
      summary = "The advertiser has sent the creative back for revisions.";
      break;
    case "response.rejected_by_advertiser":
      summary = "The advertiser has rejected the creative.";
      break;
    default:
      summary = "There is an update on your creative request.";
  }
  const text =
    `${summary}\n\n${base}\n\n` +
    (trackUrl ? `Assets Exchange tracking page: ${trackUrl}\n` : "");
  const html =
    `<p>${summary}</p><p>${base.replace(/\n/g, "<br>")}</p>` +
    (trackUrl
      ? `<p><a href="${trackUrl}">Track your asset status</a></p>`
      : "");
  return { text, html };
}

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

      case "response.rejected_by_advertiser":
        msg = `❌ *Response rejected by Advertiser*\n${base}`;
        break;

      default:
        return;
    }

    await sendAlert(msg);

    if (isEmailConfigured() && ADVERTISER_EVENTS.includes(evt.event)) {
      const { email: toEmail, trackingCode } =
        await getPublisherEmailAndTracking(evt.requestId);
      if (toEmail) {
        const subject = buildWorkflowEmailSubject(evt);
        const { text, html } = buildWorkflowEmailBody(evt, trackingCode);
        await sendEmail({ to: toEmail, subject, text, html }).catch((err) => {
          console.error("Failed to send workflow email to publisher", err);
        });
      }
    }
  } catch (err) {
    console.error("Failed to send workflow notification", err);
  }
}

export function isValidTelegramId(id: string | null | undefined): boolean {
  if (!id || typeof id !== "string") return false;
  const t = id.trim();
  if (/^-?\d+$/.test(t)) return true;
  return /^@[a-zA-Z0-9_]{5,32}$/.test(t);
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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const trackUrl = baseUrl
    ? `${baseUrl}/track?code=${encodeURIComponent(trackingCode)}`
    : "";
  const message =
    `🎉 <b>Submission Received!</b>\n\n` +
    `<b>Campaign:</b> ${escapedCampaignName}\n` +
    `<b>Tracking Code:</b> <code>${trackingCode}</code>\n\n` +
    (trackUrl ? `<a href="${trackUrl}">Assets Exchange tracking page</a>` : "");

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error("[TELEGRAM_FAILED] TELEGRAM_BOT_TOKEN is not set");
    return;
  }
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
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
