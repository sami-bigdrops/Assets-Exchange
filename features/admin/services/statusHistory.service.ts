import { db } from "@/lib/db"
import { requestStatusHistory } from "@/lib/schema"

export async function logStatusChange({
    requestId,
    fromStatus,
    toStatus,
    actorRole,
    actorId,
    reason,
}: {
    requestId: string
    fromStatus: string
    toStatus: string
    actorRole: "admin" | "advertiser"
    actorId: string
    reason?: string
}) {
    await db.insert(requestStatusHistory).values({
        requestId,
        fromStatus,
        toStatus,
        actorRole,
        actorId,
        reason: reason ?? null,
        createdAt: new Date(),
    })
}
