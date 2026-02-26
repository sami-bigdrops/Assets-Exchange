import { eq } from "drizzle-orm";

import { sendAlert } from "@/lib/alerts";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/ses";
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

      case "request.sent_back_by_admin":
        msg = `↩️ *Request sent back by Admin*\n${base}`;
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

function getBaseUrlFromHeadersLike(
  host?: string | null,
  proto?: string | null
) {
  const safeProto = proto ?? "https";
  if (!host) return process.env.NEXT_PUBLIC_APP_URL ?? "";
  return `${safeProto}://${host}`;
}

function buildTrackUrl(baseUrl: string, trackingCode: string) {
  // Your submit route uses /track?code=... in Telegram section
  return `${baseUrl}/track?code=${encodeURIComponent(trackingCode)}`;
}

export async function sendSubmissionEmailAlert(params: {
  to: string;
  trackingCode: string;
  offerName: string;
  offerId?: string | null;
  host?: string | null;
  proto?: string | null;
}) {
  const baseUrl = getBaseUrlFromHeadersLike(params.host, params.proto);
  const trackUrl = buildTrackUrl(baseUrl, params.trackingCode);

  const subject = `Submission received — Tracking Code: ${params.trackingCode}`;

  const escape = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const safeOfferName = escape(params.offerName ?? "");
  const safeOfferId = params.offerId ? escape(params.offerId) : null;

  const html =
    `<div style="font-family: Arial, sans-serif; line-height: 1.6;">` +
    `<h2>🎉 Submission Received!</h2>` +
    `<p><b>Offer Name:</b> ${safeOfferName}</p>` +
    (safeOfferId ? `<p><b>Offer ID:</b> ${safeOfferId}</p>` : ``) +
    `<p><b>Tracking Code:</b> <code>${params.trackingCode}</code></p>` +
    `<p><a href="${trackUrl}">🔗 Track your submission</a></p>` +
    `</div>`;

  await sendEmail({ to: params.to, subject, html });
}

export async function sendStatusChangeEmailAlert(params: {
  to: string;
  trackingCode: string;
  offerName: string;
  host?: string | null;
  proto?: string | null;
  status:
    | "admin_approved"
    | "admin_rejected"
    | "admin_sent_back"
    | "admin_forwarded"
    | "advertiser_approved"
    | "advertiser_rejected"
    | "advertiser_sent_back";
  reason?: string | null;
}) {
  const baseUrl = getBaseUrlFromHeadersLike(params.host, params.proto);
  const trackUrl = buildTrackUrl(baseUrl, params.trackingCode);

  const statusLabel: Record<typeof params.status, string> = {
    admin_approved: "Approved by Admin ✅",
    admin_rejected: "Rejected by Admin ❌",
    admin_sent_back: "Sent back by Admin (revisions requested) ↩️",
    admin_forwarded: "Forwarded to Advertiser 🔁",
    advertiser_approved: "Approved by Advertiser ✅",
    advertiser_rejected: "Rejected by Advertiser ❌",
    advertiser_sent_back: "Sent back by Advertiser (revisions requested)",
  };

  const subject = `Status update — ${statusLabel[params.status]} — ${params.trackingCode}`;

  const escape = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const safeOfferName = escape(params.offerName ?? "");
  const safeReason = params.reason ? escape(params.reason) : null;

  const html =
    `<div style="font-family: Arial, sans-serif; line-height: 1.6;">` +
    `<h2>${statusLabel[params.status]}</h2>` +
    `<p><b>Offer Name:</b> ${safeOfferName}</p>` +
    `<p><b>Tracking Code:</b> <code>${params.trackingCode}</code></p>` +
    (safeReason ? `<p><b>Reason:</b> ${safeReason}</p>` : ``) +
    `<p><a href="${trackUrl}">🔗 View status</a></p>` +
    `</div>`;

  await sendEmail({ to: params.to, subject, html });
}
