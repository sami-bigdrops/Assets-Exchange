import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { env } from "@/env";
import { getOffer } from "@/features/admin/services/offer.service";
import { sendSubmissionTelegramAlert } from "@/features/notifications/notification.service";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { validateRequest } from "@/lib/middleware/validateRequest";
import {
  assetsTable,
  creativeRequests,
  creatives,
  publishers,
} from "@/lib/schema";
import { sanitizePlainText } from "@/lib/security/sanitize";
import { generateTrackingCode } from "@/lib/utils/tracking";
import { submitSchema } from "@/lib/validations/publisher";

function countLines(text: string | undefined): number {
  if (!text || text.trim() === "") return 0;
  return text.split("\n").filter((line) => line.trim() !== "").length;
}

export async function POST(req: NextRequest) {
  try {
    //  Zod validation via generic helper
    const validation = await validateRequest(req, submitSchema);
    if ("response" in validation) return validation.response;

    const data = validation.data;

    // Sanitize user-stored content for XSS protection
    const sanitizedAdditionalNotes = sanitizePlainText(data.additionalNotes);
    const sanitizedFromLines = sanitizePlainText(data.fromLines);
    const sanitizedSubjectLines = sanitizePlainText(data.subjectLines);

    const offer = await getOffer(data.offerId);
    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    const publisherName = `${data.firstName} ${data.lastName}`;
    const publisherId = data.affiliateId;

    let fromLinesCount = countLines(data.fromLines);
    let subjectLinesCount = countLines(data.subjectLines);

    if (data.files?.length) {
      data.files.forEach((file) => {
        if (file.metadata) {
          const metadata = file.metadata as Record<string, unknown>;
          if (typeof metadata.fromLines === "string") {
            fromLinesCount += countLines(metadata.fromLines);
          }
          if (typeof metadata.subjectLines === "string") {
            subjectLinesCount += countLines(metadata.subjectLines);
          }
        }
      });
    }

    const priority =
      data.priority === "high" ? "High Priority" : "Medium Priority";

    const trackingCode = generateTrackingCode();

    const [request] = await db
      .insert(creativeRequests)
      .values({
        offerId: data.offerId,
        offerName: offer.offerName,
        creativeType: data.creativeType,
        creativeCount: data.files?.length || 1,
        fromLinesCount,
        subjectLinesCount,
        publisherId,
        publisherName,
        email: data.email,
        telegramId: data.telegramId || null,
        advertiserId: offer.advertiserId || "",
        advertiserName: offer.advName || "",
        affiliateId: data.affiliateId,
        clientId: data.affiliateId,
        clientName: data.companyName,
        priority,
        trackingCode,
        status: "new",
        approvalStage: "admin",
        adminStatus: "pending",
        fromLines: sanitizedFromLines,
        subjectLines: sanitizedSubjectLines,
        additionalNotes: sanitizedAdditionalNotes,
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: creativeRequests.id });

    try {
      await db.insert(assetsTable).values({
        id: request.id,
        publisherId,
        status: "new",
        createdAt: new Date(),
        approvedAt: null,
      });

      logger.app.info(
        { requestId: request.id, publisherId },
        "Inserted asset into assets_table"
      );
    } catch (error) {
      logger.app.error(
        { requestId: request.id, publisherId, error },
        "Failed to insert asset into assets_table"
      );
    }

    if (data.files?.length) {
      const now = new Date();
      const creativeRecords = data.files.map((file) => ({
        id: createId(),
        requestId: request.id,
        name: file.name,
        url: file.url,
        type: file.type,
        size: file.size,
        format: file.type.includes("image")
          ? "image"
          : file.type.includes("html")
            ? "html"
            : "other",
        status: "pending",
        metadata: file.metadata || {},
        createdAt: now,
        updatedAt: now,
        statusUpdatedAt: now,
        scanAttempts: 0,
      }));

      await db.insert(creatives).values(creativeRecords);
    }

    // ===== SEND TELEGRAM MESSAGE IF CONNECTED =====
    try {
      const [publisher] = await db
        .select({
          telegramChatId: publishers.telegramChatId,
          telegramId: publishers.telegramId,
        })
        .from(publishers)
        .where(eq(publishers.contactEmail, data.email))
        .limit(1);

      if (publisher?.telegramChatId) {
        const botToken = env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

        const h = await headers();
        const host = h.get("x-forwarded-host") ?? h.get("host");
        const proto = h.get("x-forwarded-proto") ?? "https";

        const trackingUrl = `${proto}://${host}/track?code=${encodeURIComponent(trackingCode)}`;

        const escapeHtml = (s: string) =>
          s
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

        // const safeTrackingUrl = escapeHtml(trackingUrl);
        const safeOfferName = escapeHtml(offer.offerName ?? "");
        const message =
          `<b>🎉 Submission Received!</b>\n\n` +
          `Offer Name: ${safeOfferName}\n` +
          `Offer ID: <code>${offer.offerId}</code>\n` +
          `Tracking Code: <code>${trackingCode}</code>\n\n` +
          `<a href="${trackingUrl}">🔗 Track your submission</a>`;

        await fetch(`${TELEGRAM_API_BASE}${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: publisher.telegramChatId,
            text: message,
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }),
        });
      }
    } catch (telegramError) {
      console.error("Telegram send failed:", telegramError);
    }
    // ===== END TELEGRAM SECTION =====

    if (data.telegramId) {
      sendSubmissionTelegramAlert(
        data.telegramId,
        trackingCode,
        offer.offerName
      ).catch((err) => console.error("[TELEGRAM_NOTIFY_ERROR]:", err));
    }

    return NextResponse.json(
      { success: true, requestId: request.id, trackingCode },
      { status: 201 }
    );
  } catch (error) {
    console.error("Submit error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
