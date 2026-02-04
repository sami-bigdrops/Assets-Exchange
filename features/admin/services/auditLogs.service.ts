import { and, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { auditLogs } from "@/lib/schema";

export async function getAuditLogs({
  adminId,
  actionType,
  startDate,
  endDate,
  page,
  limit,
}: {
  adminId?: string;
  actionType?: "APPROVE" | "REJECT";
  startDate?: Date;
  endDate?: Date;
  page: number;
  limit: number;
}) {
  const where: SQL[] = [];

  if (adminId) {
    where.push(eq(auditLogs.userId, adminId));
  }

  if (actionType) {
    where.push(eq(auditLogs.action, actionType));
  }

  if (startDate) {
    where.push(gte(auditLogs.createdAt, startDate));
  }

  if (endDate) {
    where.push(lte(auditLogs.createdAt, endDate));
  }

  const offset = (page - 1) * limit;
  const whereClause = where.length > 0 ? and(...where) : undefined;

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        details: auditLogs.details,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(whereClause),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);
  const totalPages = Math.ceil(total / limit);

  return {
    success: true,
    data: rows.map((row) => ({
      id: row.id,
      admin_id: row.userId,
      action: row.action,
      timestamp: row.createdAt.toISOString(),
      entityType: row.entityType,
      entityId: row.entityId,
      details: row.details,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
    })),
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}
