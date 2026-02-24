import { eq, desc } from "drizzle-orm";

import { db } from "@/lib/db";
import { creativeRequests, creativeRequestHistory } from "@/lib/schema";

type RecentActivityItem = {
  id: string;
  requestId: string;
  trackingCode: string | null;
  offerName: string;
  creativeType: string;
  actionType: string;
  newStatus: string | null;
  actionAt: Date;
  message: string;
};

function buildMessage(row: {
  actionType: string;
  newStatus: string | null;
  trackingCode: string;
}) {
  switch (row.actionType) {
    case "admin_rejected":
      return `Request ${row.trackingCode} was rejected`;
    case "admin_approved":
      return `Request ${row.trackingCode} was approved and forwarded to advertiser`;
    case "advertiser_sent_back":
      return `Request ${row.trackingCode} was sent back by advertiser`;
    case "advertiser_approved":
      return `Request ${row.trackingCode} was approved by advertiser`;
    case "advertiser_rejected":
      return `Request ${row.trackingCode} was rejected by advertiser`;
    default:
      return `Request ${row.trackingCode} status updated`;
  }
}

export async function getRecentActivityForPublisher(
  publisherId: string,
  limit = 10
): Promise<RecentActivityItem[]> {
  const rows = await db
    .select({
      id: creativeRequestHistory.id,
      requestId: creativeRequestHistory.requestId,
      actionType: creativeRequestHistory.actionType,
      newStatus: creativeRequestHistory.newStatus,
      actionAt: creativeRequestHistory.actionAt,
      trackingCode: creativeRequests.trackingCode,
      offerName: creativeRequests.offerName,
      creativeType: creativeRequests.creativeType,
    })
    .from(creativeRequestHistory)
    .innerJoin(
      creativeRequests,
      eq(creativeRequestHistory.requestId, creativeRequests.id)
    )
    .where(eq(creativeRequests.publisherId, publisherId))
    .orderBy(desc(creativeRequestHistory.actionAt))
    .limit(limit);

  return rows.map((row) => {
    const trackingCode = row.trackingCode ?? "";
    return {
      ...row,
      trackingCode,
      message: buildMessage({
        actionType: row.actionType,
        newStatus: row.newStatus,
        trackingCode,
      }),
    };
  });
}
