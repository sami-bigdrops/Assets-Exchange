import { eq, ilike, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { publishers } from "@/lib/schema";

import type { Publisher } from "../types/publisher.types";

function mapPublisher(row: typeof publishers.$inferSelect): Publisher {
  return {
    id: row.id,
    name: row.name,
    publisherName: row.name,
    pubPlatform: "",
    createdMethod: "Manually" as const,
    contactEmail: row.contactEmail,
    status: row.status as "active" | "inactive",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listPublishers({
  search,
  page = 1,
  limit = 20,
}: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const offset = (page - 1) * limit;
  const where = search ? ilike(publishers.name, `%${search}%`) : undefined;

  const [rows, [countResult]] = await Promise.all([
    db
      .select()
      .from(publishers)
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(sql`${publishers.createdAt} DESC`),
    db
      .select({ count: sql<number>`count(*)` })
      .from(publishers)
      .where(where),
  ]);

  return {
    data: rows.map(mapPublisher),
    meta: {
      total: Number(countResult.count),
      page,
      limit,
    },
  };
}

export async function getPublisher(id: string) {
  const [row] = await db.select().from(publishers).where(eq(publishers.id, id));
  return row ? mapPublisher(row) : null;
}

export async function createPublisher(data: {
  name: string;
  contactEmail?: string;
}) {
  const [row] = await db
    .insert(publishers)
    .values({
      name: data.name,
      contactEmail: data.contactEmail,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return mapPublisher(row);
}

export async function updatePublisher(
  id: string,
  data: Partial<{
    name: string;
    contactEmail: string;
    status: "active" | "inactive";
  }>
) {
  const [row] = await db
    .update(publishers)
    .set({
      name: data.name,
      contactEmail: data.contactEmail,
      status: data.status,
      updatedAt: new Date(),
    })
    .where(eq(publishers.id, id))
    .returning();

  return row ? mapPublisher(row) : null;
}

export async function softDeletePublisher(id: string) {
  await db
    .update(publishers)
    .set({
      status: "inactive",
      updatedAt: new Date(),
    })
    .where(eq(publishers.id, id));
}
