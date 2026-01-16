import { and, eq, inArray, ilike, or, sql, type SQL } from "drizzle-orm"

import { logStatusChange } from "@/features/admin/services/statusHistory.service"
import { notifyWorkflowEvent } from "@/features/notifications/notification.service"
import type { WorkflowEvent } from "@/features/notifications/types"
import { db } from "@/lib/db"
import { creativeRequests } from "@/lib/schema"


export async function getAdminRequests({
  page,
  limit,
  status,
  approvalStage,
  search,
  sort,
}: {
  page: number
  limit: number
  status?: ("new" | "pending" | "approved" | "rejected" | "sent-back")[]
  approvalStage?: "admin" | "advertiser" | "completed"
  search?: string
  sort?: string
}) {
  const where: SQL[] = []
  if (status) where.push(inArray(creativeRequests.status, status))
  if (approvalStage) where.push(eq(creativeRequests.approvalStage, approvalStage))
  if (search) {
    const searchCondition = or(
      ilike(creativeRequests.offerName, `%${search}%`),
      ilike(creativeRequests.id, `%${search}%`)
    )
    if (searchCondition) where.push(searchCondition)
  }

  const offset = (page - 1) * limit

  const orderBy: ReturnType<typeof sql> =
    sort === "submittedAt:asc"
      ? sql`${creativeRequests.submittedAt} ASC`
      : sql`${creativeRequests.submittedAt} DESC`

  const [rows, total] = await Promise.all([
    db.select({
      id: creativeRequests.id,
      offerName: creativeRequests.offerName,
      status: creativeRequests.status,
      approvalStage: creativeRequests.approvalStage,
      submittedAt: creativeRequests.submittedAt,
      creativeType: creativeRequests.creativeType,
      advertiserName: creativeRequests.advertiserName,
      priority: creativeRequests.priority,
    }).from(creativeRequests).where(and(...where)).limit(limit).offset(offset).orderBy(orderBy),
    db.select({ count: sql<number>`count(*)` }).from(creativeRequests).where(and(...where)),
  ])

  return {
    data: rows,
    meta: {
      page,
      limit,
      total: Number(total[0].count),
    },
  }
}

export async function getAdminRequestById(id: string) {
  const [row] = await db
    .select()
    .from(creativeRequests)
    .where(eq(creativeRequests.id, id))

  return row ?? null
}

export async function approveRequest(id: string, adminId: string) {
  let evt: WorkflowEvent | null = null
  let historyEntry: Parameters<typeof logStatusChange>[0] | null = null

  await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(creativeRequests)
      .where(eq(creativeRequests.id, id))
      .for("update")

    if (!row) {
      throw new Error("Request not found")
    }

    if (row.status !== "new" || row.approvalStage !== "admin") {
      throw new Error("Invalid state transition")
    }

    await tx
      .update(creativeRequests)
      .set({
        status: "pending",
        approvalStage: "advertiser",
        adminApprovedAt: new Date(),
        adminStatus: "approved",
      })
      .where(eq(creativeRequests.id, id))

    evt = {
      event: "request.approved_by_admin",
      requestId: row.id,
      offerName: row.offerName,
      fromStatus: "new",
      toStatus: "pending",
      actor: { role: "admin", id: adminId },
      timestamp: new Date().toISOString(),
    }

    historyEntry = {
      requestId: row.id,
      fromStatus: "new",
      toStatus: "pending",
      actorRole: "admin",
      actorId: adminId,
    }
  })

  if (evt) await notifyWorkflowEvent(evt)
  if (historyEntry) await logStatusChange(historyEntry)
}

export async function rejectRequest(id: string, adminId: string, reason: string) {
  let evt: WorkflowEvent | null = null
  let historyEntry: Parameters<typeof logStatusChange>[0] | null = null

  await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(creativeRequests)
      .where(eq(creativeRequests.id, id))
      .for("update")

    if (!row) {
      throw new Error("Request not found")
    }

    if (row.status !== "new" || row.approvalStage !== "admin") {
      throw new Error("Invalid state transition")
    }

    await tx
      .update(creativeRequests)
      .set({
        status: "rejected",
        adminComments: reason,
        adminStatus: "rejected",
      })
      .where(eq(creativeRequests.id, id))

    evt = {
      event: "request.rejected_by_admin",
      requestId: row.id,
      offerName: row.offerName,
      fromStatus: "new",
      toStatus: "rejected",
      actor: { role: "admin", id: adminId },
      timestamp: new Date().toISOString(),
    }

    historyEntry = {
      requestId: row.id,
      fromStatus: "new",
      toStatus: "rejected",
      actorRole: "admin",
      actorId: adminId,
      reason,
    }
  })

  if (evt) await notifyWorkflowEvent(evt)
  if (historyEntry) await logStatusChange(historyEntry)
}
