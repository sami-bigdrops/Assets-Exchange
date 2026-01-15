import { eq, and, inArray, sql, gte, lt } from "drizzle-orm"

import { db } from "@/lib/db"
import { creativeRequests } from "@/lib/schema"

import type { DashboardStats } from "../types/dashboard.types"

export async function getDashboardStats(): Promise<DashboardStats> {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const yesterdayStart = new Date(todayStart)
    yesterdayStart.setDate(yesterdayStart.getDate() - 1)

    const [
        totalAssets,
        newRequests,
        approved,
        rejected,
        pending,
        newToday,
        newYesterday,
        approvedToday,
        approvedYesterday,
    ] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(creativeRequests),
        db.select({ count: sql<number>`count(*)` })
            .from(creativeRequests)
            .where(and(eq(creativeRequests.status, "new"), eq(creativeRequests.approvalStage, "admin"))),

        db.select({ count: sql<number>`count(*)` })
            .from(creativeRequests)
            .where(and(eq(creativeRequests.status, "approved"), eq(creativeRequests.approvalStage, "completed"))),

        db.select({ count: sql<number>`count(*)` })
            .from(creativeRequests)
            .where(eq(creativeRequests.status, "rejected")),

        db.select({ count: sql<number>`count(*)` })
            .from(creativeRequests)
            .where(inArray(creativeRequests.status, ["new", "pending"])),

        db.select({ count: sql<number>`count(*)` })
            .from(creativeRequests)
            .where(
                and(
                    eq(creativeRequests.status, "new"),
                    eq(creativeRequests.approvalStage, "admin"),
                    gte(creativeRequests.submittedAt, todayStart)
                )
            ),

        db.select({ count: sql<number>`count(*)` })
            .from(creativeRequests)
            .where(
                and(
                    eq(creativeRequests.status, "new"),
                    eq(creativeRequests.approvalStage, "admin"),
                    gte(creativeRequests.submittedAt, yesterdayStart),
                    lt(creativeRequests.submittedAt, todayStart)
                )
            ),

        db.select({ count: sql<number>`count(*)` })
            .from(creativeRequests)
            .where(
                and(
                    eq(creativeRequests.status, "approved"),
                    eq(creativeRequests.approvalStage, "completed"),
                    gte(creativeRequests.adminApprovedAt, todayStart)
                )
            ),

        db.select({ count: sql<number>`count(*)` })
            .from(creativeRequests)
            .where(
                and(
                    eq(creativeRequests.status, "approved"),
                    eq(creativeRequests.approvalStage, "completed"),
                    gte(creativeRequests.adminApprovedAt, yesterdayStart),
                    lt(creativeRequests.adminApprovedAt, todayStart)
                )
            ),
    ])

    return {
        totals: {
            totalAssets: Number(totalAssets[0].count),
            newRequests: Number(newRequests[0].count),
            approved: Number(approved[0].count),
            rejected: Number(rejected[0].count),
            pending: Number(pending[0].count),
        },
        trends: {
            newRequests: {
                today: Number(newToday[0].count),
                yesterday: Number(newYesterday[0].count),
            },
            approved: {
                today: Number(approvedToday[0].count),
                yesterday: Number(approvedYesterday[0].count),
            },
        },
    }
}
