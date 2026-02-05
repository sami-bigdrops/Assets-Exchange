import {
  and,
  asc,
  eq,
  inArray,
  ilike,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { logStatusChange } from "@/features/admin/services/statusHistory.service";
import { notifyWorkflowEvent } from "@/features/notifications/notification.service";
import type { WorkflowEvent } from "@/features/notifications/types";
import { db } from "@/lib/db";
import { creativeRequests, offers, advertisers, creatives } from "@/lib/schema";

export async function getAdminRequests({
  page,
  limit,
  status,
  approvalStage,
  search,
  sort,
}: {
  page: number;
  limit: number;
  status?: ("new" | "pending" | "approved" | "rejected" | "sent-back")[];
  approvalStage?: "admin" | "advertiser" | "completed";
  search?: string;
  sort?: string;
}) {
  const where: SQL[] = [];
  if (status) where.push(inArray(creativeRequests.status, status));
  if (approvalStage)
    where.push(eq(creativeRequests.approvalStage, approvalStage));
  if (search) {
    const searchCondition = or(
      ilike(creativeRequests.offerName, `%${search}%`),
      ilike(creativeRequests.id, `%${search}%`)
    );
    if (searchCondition) where.push(searchCondition);
  }

  const offset = (page - 1) * limit;

  const orderBy: ReturnType<typeof sql> =
    sort === "submittedAt:asc"
      ? sql`${creativeRequests.submittedAt} ASC`
      : sql`${creativeRequests.submittedAt} DESC`;

  const [rows, total] = await Promise.all([
    db
      .select({
        id: creativeRequests.id,
        offerName: creativeRequests.offerName,
        status: creativeRequests.status,
        approvalStage: creativeRequests.approvalStage,
        submittedAt: creativeRequests.submittedAt,
        creativeType: creativeRequests.creativeType,
        advertiserName: creativeRequests.advertiserName,
        priority: creativeRequests.priority,
        offerId: offers.everflowOfferId,
        creativeCount: creativeRequests.creativeCount,
        fromLinesCount: creativeRequests.fromLinesCount,
        subjectLinesCount: creativeRequests.subjectLinesCount,
        affiliateId: creativeRequests.affiliateId,
        clientId: creativeRequests.clientId,
        clientName: creativeRequests.clientName,
        advertiserEverflowId: advertisers.everflowAdvertiserId,
      })
      .from(creativeRequests)
      .leftJoin(offers, eq(creativeRequests.offerId, offers.id))
      .leftJoin(advertisers, eq(offers.advertiserId, advertisers.id))
      .where(and(...where))
      .limit(limit)
      .offset(offset)
      .orderBy(orderBy),
    db
      .select({ count: sql<number>`count(*)` })
      .from(creativeRequests)
      .where(and(...where)),
  ]);

  const formattedRows = rows.map((row) => ({
    ...row,
    date: row.submittedAt
      ? new Date(row.submittedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "America/Los_Angeles",
        }) +
        ", " +
        new Date(row.submittedAt).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "America/Los_Angeles",
        })
      : "",
  }));

  return {
    data: formattedRows,
    meta: {
      page,
      limit,
      total: Number(total[0].count),
    },
  };
}

export async function getAdminRequestById(id: string) {
  const [row] = await db
    .select()
    .from(creativeRequests)
    .where(eq(creativeRequests.id, id));

  return row ?? null;
}

export type RequestCreativeRow = {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  format: string | null;
};

export async function getRequestWithCreatives(requestId: string) {
  const [requestRow] = await db
    .select()
    .from(creativeRequests)
    .where(eq(creativeRequests.id, requestId));

  if (!requestRow) return null;

  const creativeRows = await db
    .select({
      id: creatives.id,
      name: creatives.name,
      url: creatives.url,
      size: creatives.size,
      type: creatives.type,
      format: creatives.format,
    })
    .from(creatives)
    .where(
      and(
        eq(creatives.requestId, requestId),
        ne(creatives.status, "superseded")
      )
    )
    .orderBy(asc(creatives.createdAt));

  return {
    request: requestRow,
    creatives: creativeRows as RequestCreativeRow[],
  };
}

export async function approveRequest(id: string, adminId: string) {
  let evt: WorkflowEvent | null = null;
  let historyEntry: Parameters<typeof logStatusChange>[0] | null = null;

  await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(creativeRequests)
      .where(eq(creativeRequests.id, id))
      .for("update");

    if (!row) {
      throw new Error("Request not found");
    }

    const isValidStatus =
      row.status === "new" ||
      row.status === "revised" ||
      (row.status === "pending" && row.approvalStage === "admin");
    if (!isValidStatus || row.approvalStage !== "admin") {
      throw new Error("Invalid state transition");
    }

    await tx
      .update(creativeRequests)
      .set({
        status: "approved",
        approvalStage: "admin",
        adminApprovedBy: adminId,
        adminApprovedAt: new Date(),
        adminStatus: "approved",
        updatedAt: new Date(),
      })
      .where(eq(creativeRequests.id, id));

    await tx
      .update(creatives)
      .set({ status: "approved", updatedAt: new Date() })
      .where(
        and(eq(creatives.requestId, id), ne(creatives.status, "superseded"))
      );

    evt = {
      event: "request.approved_by_admin",
      requestId: row.id,
      offerName: row.offerName,
      fromStatus: row.status,
      toStatus: "approved",
      actor: { role: "admin", id: adminId },
      timestamp: new Date().toISOString(),
    };

    historyEntry = {
      requestId: row.id,
      fromStatus: row.status,
      toStatus: "approved",
      actorRole: "admin",
      actorId: adminId,
    };
  });

  if (evt) await notifyWorkflowEvent(evt);
  if (historyEntry) await logStatusChange(historyEntry);
}

export async function forwardRequest(id: string, adminId: string) {
  let evt: WorkflowEvent | null = null;
  let historyEntry: Parameters<typeof logStatusChange>[0] | null = null;

  await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(creativeRequests)
      .where(eq(creativeRequests.id, id))
      .for("update");

    if (!row) {
      throw new Error("Request not found");
    }

    const isValidStatus =
      row.status === "new" ||
      row.status === "revised" ||
      (row.status === "pending" && row.approvalStage === "admin");
    if (!isValidStatus || row.approvalStage !== "admin") {
      throw new Error("Invalid state transition");
    }

    await tx
      .update(creativeRequests)
      .set({
        status: "pending",
        approvalStage: "advertiser",
        adminApprovedBy: adminId,
        adminApprovedAt: new Date(),
        adminStatus: "approved",
        updatedAt: new Date(),
      })
      .where(eq(creativeRequests.id, id));

    await tx
      .update(creatives)
      .set({ status: "pending", updatedAt: new Date() })
      .where(
        and(eq(creatives.requestId, id), ne(creatives.status, "superseded"))
      );

    evt = {
      event: "request.forwarded_to_advertiser",
      requestId: row.id,
      offerName: row.offerName,
      fromStatus: row.status,
      toStatus: "pending",
      actor: { role: "admin", id: adminId },
      timestamp: new Date().toISOString(),
    };

    historyEntry = {
      requestId: row.id,
      fromStatus: row.status,
      toStatus: "pending",
      actorRole: "admin",
      actorId: adminId,
    };
  });

  if (evt) await notifyWorkflowEvent(evt);
  if (historyEntry) await logStatusChange(historyEntry);
}

export async function rejectRequest(
  id: string,
  adminId: string,
  reason: string
) {
  let evt: WorkflowEvent | null = null;
  let historyEntry: Parameters<typeof logStatusChange>[0] | null = null;

  await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(creativeRequests)
      .where(eq(creativeRequests.id, id))
      .for("update");

    if (!row) {
      throw new Error("Request not found");
    }

    const isValidStatus =
      row.status === "new" ||
      row.status === "revised" ||
      (row.status === "pending" && row.approvalStage === "admin");
    if (!isValidStatus || row.approvalStage !== "admin") {
      throw new Error("Invalid state transition");
    }

    await tx
      .update(creativeRequests)
      .set({
        status: "rejected",
        adminComments: reason,
        adminStatus: "rejected",
      })
      .where(eq(creativeRequests.id, id));

    evt = {
      event: "request.rejected_by_admin",
      requestId: row.id,
      offerName: row.offerName,
      fromStatus: row.status,
      toStatus: "rejected",
      actor: { role: "admin", id: adminId },
      timestamp: new Date().toISOString(),
    };

    historyEntry = {
      requestId: row.id,
      fromStatus: row.status,
      toStatus: "rejected",
      actorRole: "admin",
      actorId: adminId,
      reason,
    };
  });

  if (evt) await notifyWorkflowEvent(evt);
  if (historyEntry) await logStatusChange(historyEntry);
}

export async function sendBackRequest(
  id: string,
  adminId: string,
  feedback: string
) {
  let evt: WorkflowEvent | null = null;
  let historyEntry: Parameters<typeof logStatusChange>[0] | null = null;

  await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(creativeRequests)
      .where(eq(creativeRequests.id, id))
      .for("update");

    if (!row) {
      throw new Error("Request not found");
    }

    const isValidStatus =
      row.status === "new" ||
      row.status === "revised" ||
      (row.status === "pending" && row.approvalStage === "admin");
    if (!isValidStatus || row.approvalStage !== "admin") {
      throw new Error("Invalid state transition");
    }

    await tx
      .update(creativeRequests)
      .set({
        status: "sent-back",
        adminComments: feedback,
        adminStatus: "rejected",
        updatedAt: new Date(),
      })
      .where(eq(creativeRequests.id, id));

    await tx
      .update(creatives)
      .set({
        status: "sent-back",
        updatedAt: new Date(),
      })
      .where(
        and(eq(creatives.requestId, id), ne(creatives.status, "superseded"))
      );

    evt = {
      event: "request.sent_back_by_admin",
      requestId: row.id,
      offerName: row.offerName,
      fromStatus: row.status,
      toStatus: "sent-back",
      actor: { role: "admin", id: adminId },
      timestamp: new Date().toISOString(),
    };

    historyEntry = {
      requestId: row.id,
      fromStatus: row.status,
      toStatus: "sent-back",
      actorRole: "admin",
      actorId: adminId,
      reason: feedback,
    };
  });

  if (evt) await notifyWorkflowEvent(evt);
  if (historyEntry) await logStatusChange(historyEntry);
}
