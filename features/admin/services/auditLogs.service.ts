import { and, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { auditLogs } from "@/lib/schema";

export interface AuditLogsExportFilters {
  adminId?: string;
  actionType?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface AuditLogsFilterParams {
  adminId?: string;
  actionType?: "APPROVE" | "REJECT";
  startDate?: Date;
  endDate?: Date;
}

/**
 * Builds WHERE clause conditions for audit logs queries.
 * This is the single source of truth for filter logic - used by both
 * getAuditLogs() and streamAuditLogsForExport() to ensure consistency.
 *
 * @param filters - Filter parameters
 * @returns SQL WHERE clause and normalized filter values for logging
 */
export function buildAuditLogsWhereClause(filters: AuditLogsFilterParams): {
  whereClause: SQL | undefined;
  normalizedFilters: {
    adminId?: string;
    actionType?: string;
    startDate?: string;
    endDate?: string;
  };
} {
  const where: SQL[] = [];
  const normalizedFilters: {
    adminId?: string;
    actionType?: string;
    startDate?: string;
    endDate?: string;
  } = {};

  if (filters.adminId) {
    where.push(eq(auditLogs.userId, filters.adminId));
    normalizedFilters.adminId = filters.adminId;
  }

  if (filters.actionType) {
    where.push(eq(auditLogs.action, filters.actionType));
    normalizedFilters.actionType = filters.actionType;
  }

  if (filters.startDate) {
    where.push(gte(auditLogs.createdAt, filters.startDate));
    normalizedFilters.startDate = filters.startDate.toISOString();
  }

  if (filters.endDate) {
    // Include the full end date (up to 23:59:59.999)
    // This ensures date-only inputs include the entire day
    const endDateWithTime = new Date(filters.endDate);
    if (
      endDateWithTime.getHours() === 0 &&
      endDateWithTime.getMinutes() === 0 &&
      endDateWithTime.getSeconds() === 0
    ) {
      endDateWithTime.setHours(23, 59, 59, 999);
    }
    where.push(lte(auditLogs.createdAt, endDateWithTime));
    normalizedFilters.endDate = endDateWithTime.toISOString();
  }

  const whereClause = where.length > 0 ? and(...where) : undefined;

  return { whereClause, normalizedFilters };
}

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
  try {
    // Use shared filter builder to ensure consistency with export endpoint
    const { whereClause, normalizedFilters } = buildAuditLogsWhereClause({
      adminId,
      actionType,
      startDate,
      endDate,
    });

    // Log the SQL conditions for verification (only in development or when explicitly enabled)
    if (process.env.LOG_SQL_CONDITIONS === "true") {
      logger.app.debug(
        {
          endpoint: "getAuditLogs",
          normalizedFilters,
          hasWhereClause: whereClause !== undefined,
        },
        "Audit logs WHERE clause built"
      );
    }

    const offset = (page - 1) * limit;

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
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    throw error;
  }
}

/**
 * Streaming export function that yields audit log rows in batches.
 * Uses the same filter conditions as getAuditLogs() but without pagination.
 * Returns an async generator that yields rows one at a time, avoiding loading
 * all rows into memory. The query automatically uses indexes on user_id,
 * action, and created_at when those filters are applied.
 */
export async function* streamAuditLogsForExport({
  adminId,
  actionType,
  startDate,
  endDate,
}: AuditLogsExportFilters): AsyncGenerator<
  {
    id: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string | null;
    details: unknown;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
  },
  void,
  unknown
> {
  // Use shared filter builder to ensure consistency with getAuditLogs
  // This guarantees both endpoints generate identical WHERE clauses
  const { whereClause, normalizedFilters } = buildAuditLogsWhereClause({
    adminId,
    actionType: actionType as "APPROVE" | "REJECT" | undefined,
    startDate,
    endDate,
  });

  // Log the SQL conditions for verification (only in development or when explicitly enabled)
  if (process.env.LOG_SQL_CONDITIONS === "true") {
    logger.app.debug(
      {
        endpoint: "streamAuditLogsForExport",
        normalizedFilters,
        hasWhereClause: whereClause !== undefined,
      },
      "Audit logs WHERE clause built"
    );
  }

  // Batch size for streaming (processes 1000 rows at a time to avoid memory issues)
  // This ensures constant memory usage: only one batch (1000 rows) is in memory at a time
  // Each batch is yielded row-by-row, so the generator consumer processes one row at a time
  const BATCH_SIZE = 1000;
  let offset = 0;
  let hasMore = true;

  // Stream rows in batches without loading everything into memory
  // Memory safety: Only one batch (max 1000 rows) exists in memory at any time
  // Each row is yielded immediately, allowing the consumer to process and discard it
  // This prevents memory spikes even for exports with millions of rows
  while (hasMore) {
    // Fetch one batch from database (max 1000 rows)
    // This batch will be processed and discarded before the next batch is fetched
    const batch = await db
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
      .limit(BATCH_SIZE)
      .offset(offset);

    // Yield each row from the batch one at a time
    // The consumer processes each row immediately, so memory is freed as we go
    // No accumulation of rows - constant memory usage regardless of total row count
    for (const row of batch) {
      yield row;
    }

    // Check if there are more rows to fetch
    // If batch.length < BATCH_SIZE, we've reached the end
    hasMore = batch.length === BATCH_SIZE;
    offset += BATCH_SIZE;

    // At this point, the batch array is eligible for garbage collection
    // before the next batch is fetched, ensuring constant memory usage
  }
}
