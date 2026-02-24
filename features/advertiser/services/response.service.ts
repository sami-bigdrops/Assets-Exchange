import {
  and,
  eq,
  ilike,
  or,
  sql,
  inArray,
  isNotNull,
  type SQL,
} from "drizzle-orm";

import { logStatusChange } from "@/features/admin/services/statusHistory.service";
import { notifyWorkflowEvent } from "@/features/notifications/notification.service";
import type { WorkflowEvent } from "@/features/notifications/types";
import { db } from "@/lib/db";
import { creativeRequests, offers } from "@/lib/schema";

export async function getAdvertiserResponses({
  advertiserId,
  page,
  limit,
  status,
  search,
}: {
  advertiserId: string;
  page: number;
  limit: number;
  status?: string[];
  search?: string;
}) {
  const where: SQL[] = [eq(creativeRequests.advertiserId, advertiserId)];

  if (status && status.length > 0) {
    type RequestStatusUnion =
      | "new"
      | "pending"
      | "approved"
      | "rejected"
      | "sent-back"
      | "revised";
    where.push(
      inArray(
        creativeRequests.status,
        status as unknown as [RequestStatusUnion, ...RequestStatusUnion[]]
      )
    );
  } else {
    where.push(
      or(
        eq(creativeRequests.approvalStage, "advertiser"),
        isNotNull(creativeRequests.advertiserStatus)
      ) as SQL
    );
  }
  if (search) {
    const searchCondition = or(
      ilike(creativeRequests.offerName, `%${search}%`),
      ilike(creativeRequests.id, `%${search}%`)
    );
    if (searchCondition) where.push(searchCondition);
  }

  const offset = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    db
      .select({
        id: creativeRequests.id,
        offerName: creativeRequests.offerName,
        status: creativeRequests.status,
        approvalStage: creativeRequests.approvalStage,
        submittedAt: creativeRequests.submittedAt,
        creativeType: creativeRequests.creativeType,
        creativeCount: creativeRequests.creativeCount,
        fromLinesCount: creativeRequests.fromLinesCount,
        subjectLinesCount: creativeRequests.subjectLinesCount,
        advertiserName: creativeRequests.advertiserName,
        priority: creativeRequests.priority,
        offerId: creativeRequests.offerId,
        everflowOfferId: offers.everflowOfferId,
        affiliateId: creativeRequests.affiliateId,
        clientId: creativeRequests.clientId,
        clientName: creativeRequests.clientName,
        advertiserRespondedAt: creativeRequests.advertiserRespondedAt,
        advertiserStatus: creativeRequests.advertiserStatus,
        advertiserComments: creativeRequests.advertiserComments,
      })
      .from(creativeRequests)
      .leftJoin(offers, eq(creativeRequests.offerId, offers.id))
      .where(and(...where))
      .limit(limit)
      .offset(offset)
      .orderBy(sql`${creativeRequests.submittedAt} DESC`),

    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(and(...where)),
  ]);

  return { data: rows, meta: { page, limit, total: Number(total[0].count) } };
}

export async function approveResponse(id: string, advertiserId: string) {
  let evt: WorkflowEvent | null = null;
  let historyEntry: Parameters<typeof logStatusChange>[0] | null = null;

  await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(creativeRequests)
      .where(
        and(
          eq(creativeRequests.id, id),
          eq(creativeRequests.advertiserId, advertiserId)
        )
      )
      .for("update");

    if (!row) {
      throw new Error("Request not found");
    }

    if (row.status !== "pending" || row.approvalStage !== "advertiser") {
      throw new Error("Invalid state transition");
    }

    await tx
      .update(creativeRequests)
      .set({
        status: "pending",
        approvalStage: "admin",
        advertiserStatus: "approved",
        advertiserRespondedAt: new Date(),
      })
      .where(eq(creativeRequests.id, id));

    evt = {
      event: "response.approved_by_advertiser",
      requestId: row.id,
      offerName: row.offerName,
      fromStatus: "pending",
      toStatus: "approved",
      actor: { role: "advertiser", id: advertiserId },
      timestamp: new Date().toISOString(),
    };

    historyEntry = {
      requestId: row.id,
      fromStatus: "pending",
      toStatus: "approved",
      actorRole: "advertiser",
      actorId: advertiserId,
    };
  });

  if (evt) await notifyWorkflowEvent(evt);
  if (historyEntry) await logStatusChange(historyEntry);
}

export async function sendBackResponse(
  id: string,
  advertiserId: string,
  reason: string
) {
  let evt: WorkflowEvent | null = null;
  let historyEntry: Parameters<typeof logStatusChange>[0] | null = null;

  await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(creativeRequests)
      .where(
        and(
          eq(creativeRequests.id, id),
          eq(creativeRequests.advertiserId, advertiserId)
        )
      )
      .for("update");

    if (!row) {
      throw new Error("Request not found");
    }

    if (row.status !== "pending" || row.approvalStage !== "advertiser") {
      throw new Error("Invalid state transition");
    }

    await tx
      .update(creativeRequests)
      .set({
        status: "sent-back",
        approvalStage: "admin",
        advertiserStatus: "sent_back",
        advertiserComments: reason,
        advertiserRespondedAt: new Date(),
      })
      .where(eq(creativeRequests.id, id));

    evt = {
      event: "response.sent_back_by_advertiser",
      requestId: row.id,
      offerName: row.offerName,
      fromStatus: "pending",
      toStatus: "sent-back",
      actor: { role: "advertiser", id: advertiserId },
      timestamp: new Date().toISOString(),
    };

    historyEntry = {
      requestId: row.id,
      fromStatus: "pending",
      toStatus: "sent-back",
      actorRole: "advertiser",
      actorId: advertiserId,
      reason,
    };
  });

  if (evt) await notifyWorkflowEvent(evt);
  if (historyEntry) await logStatusChange(historyEntry);
}

export async function rejectResponse(
  id: string,
  advertiserId: string,
  reason: string
) {
  let evt: WorkflowEvent | null = null;
  let historyEntry: Parameters<typeof logStatusChange>[0] | null = null;

  await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(creativeRequests)
      .where(
        and(
          eq(creativeRequests.id, id),
          eq(creativeRequests.advertiserId, advertiserId)
        )
      )
      .for("update");

    if (!row) {
      throw new Error("Request not found");
    }

    if (row.status !== "pending" || row.approvalStage !== "advertiser") {
      throw new Error("Invalid state transition");
    }

    await tx
      .update(creativeRequests)
      .set({
        status: "rejected",
        approvalStage: "admin",
        advertiserStatus: "rejected",
        advertiserComments: reason,
        advertiserRespondedAt: new Date(),
      })
      .where(eq(creativeRequests.id, id));

    evt = {
      event: "response.rejected_by_advertiser",
      requestId: row.id,
      offerName: row.offerName,
      fromStatus: "pending",
      toStatus: "rejected",
      actor: { role: "advertiser", id: advertiserId },
      timestamp: new Date().toISOString(),
    };

    historyEntry = {
      requestId: row.id,
      fromStatus: "pending",
      toStatus: "pending",
      actorRole: "advertiser",
      actorId: advertiserId,
      reason,
    };
  });

  if (evt) await notifyWorkflowEvent(evt);
  if (historyEntry) await logStatusChange(historyEntry);
}
