import { and, eq, ilike, or, sql, type SQL } from "drizzle-orm"

import { logStatusChange } from "@/features/admin/services/statusHistory.service"
import { notifyWorkflowEvent } from "@/features/notifications/notification.service"
import type { WorkflowEvent } from "@/features/notifications/types"
import { db } from "@/lib/db"
import { creativeRequests } from "@/lib/schema"

export async function getAdvertiserResponses({
    advertiserId,
    page,
    limit,
    status,
    search,
}: {
    advertiserId: string
    page: number
    limit: number
    status?: string[]
    search?: string
}) {
    const where: SQL[] = [
        eq(creativeRequests.advertiserId, advertiserId),
        eq(creativeRequests.approvalStage, "advertiser"),
    ]
    if (status) where.push(sql`${creativeRequests.status} = ANY(${status})`)
    if (search) {
        const searchCondition = or(
            ilike(creativeRequests.offerName, `%${search}%`),
            ilike(creativeRequests.id, `%${search}%`)
        )
        if (searchCondition) where.push(searchCondition)
    }

    const offset = (page - 1) * limit

    const [rows, total] = await Promise.all([
        db.select()
            .from(creativeRequests)
            .where(and(...where))
            .limit(limit)
            .offset(offset)
            .orderBy(sql`${creativeRequests.submittedAt} DESC`),

        db.select({ count: sql<number>`count(*)` })
            .from(creativeRequests)
            .where(and(...where)),
    ])

    return { data: rows, meta: { page, limit, total: Number(total[0].count) } }
}

export async function approveResponse(id: string, advertiserId: string) {
    let evt: WorkflowEvent | null = null
    let historyEntry: Parameters<typeof logStatusChange>[0] | null = null

    await db.transaction(async (tx) => {
        const [row] = await tx
            .select()
            .from(creativeRequests)
            .where(and(eq(creativeRequests.id, id), eq(creativeRequests.advertiserId, advertiserId)))
            .for("update")

        if (!row) {
            throw new Error("Request not found")
        }

        if (row.status !== "pending" || row.approvalStage !== "advertiser") {
            throw new Error("Invalid state transition")
        }

        await tx
            .update(creativeRequests)
            .set({
                status: "approved",
                approvalStage: "completed",
                advertiserStatus: "approved",
                advertiserRespondedAt: new Date(),
            })
            .where(eq(creativeRequests.id, id))

        evt = {
            event: "response.approved_by_advertiser",
            requestId: row.id,
            offerName: row.offerName,
            fromStatus: "pending",
            toStatus: "approved",
            actor: { role: "advertiser", id: advertiserId },
            timestamp: new Date().toISOString(),
        }

        historyEntry = {
            requestId: row.id,
            fromStatus: "pending",
            toStatus: "approved",
            actorRole: "advertiser",
            actorId: advertiserId,
        }
    })

    if (evt) await notifyWorkflowEvent(evt)
    if (historyEntry) await logStatusChange(historyEntry)
}

export async function sendBackResponse(id: string, advertiserId: string, reason: string) {
    let evt: WorkflowEvent | null = null
    let historyEntry: Parameters<typeof logStatusChange>[0] | null = null

    await db.transaction(async (tx) => {
        const [row] = await tx
            .select()
            .from(creativeRequests)
            .where(and(eq(creativeRequests.id, id), eq(creativeRequests.advertiserId, advertiserId)))
            .for("update")

        if (!row) {
            throw new Error("Request not found")
        }

        if (row.status !== "pending" || row.approvalStage !== "advertiser") {
            throw new Error("Invalid state transition")
        }

        await tx
            .update(creativeRequests)
            .set({
                status: "sent-back",
                approvalStage: "advertiser",
                advertiserStatus: "sent_back",
                advertiserComments: reason,
                advertiserRespondedAt: new Date(),
            })
            .where(eq(creativeRequests.id, id))

        evt = {
            event: "response.sent_back_by_advertiser",
            requestId: row.id,
            offerName: row.offerName,
            fromStatus: "pending",
            toStatus: "sent-back",
            actor: { role: "advertiser", id: advertiserId },
            timestamp: new Date().toISOString(),
        }

        historyEntry = {
            requestId: row.id,
            fromStatus: "pending",
            toStatus: "sent-back",
            actorRole: "advertiser",
            actorId: advertiserId,
            reason,
        }
    })

    if (evt) await notifyWorkflowEvent(evt)
    if (historyEntry) await logStatusChange(historyEntry)
}
