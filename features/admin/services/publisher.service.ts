import { eq, ilike, sql, and, or, asc, desc, count } from "drizzle-orm"

import { db } from "@/lib/db"
import { publishers } from "@/lib/schema"

import type { Publisher } from "../types/publisher.types"

function mapPublisher(row: typeof publishers.$inferSelect): Publisher {
  return {
    id: row.id,
    name: row.name,
    publisherName: row.name,
    platform: row.platform || "",
    createdMethod: (row.createdMethod as "API" | "Manually") || "Manually",
    contactEmail: row.contactEmail,
    status: row.status as "active" | "inactive",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export type PublisherFilters = {
  search?: string
  status?: "Active" | "Inactive" | "active" | "inactive"
  platform?: string
  createdMethod?: "Manually" | "API"
  sortBy?: string
  sortOrder?: "asc" | "desc"
  page?: number
  limit?: number
}

export async function listPublishers(filters: PublisherFilters = {}) {
  const {
    search,
    status,
    platform,
    createdMethod,
    sortBy = "createdAt",
    sortOrder = "desc",
    page = 1,
    limit = 10,
  } = filters

  const conditions = []

  if (search) {
    conditions.push(
      or(
        ilike(publishers.name, `%${search}%`),
        ilike(publishers.id, `%${search}%`),
        ilike(publishers.platform, `%${search}%`)
      )
    )
  }

  if (status) {
    conditions.push(ilike(publishers.status, status))
  }

  if (platform) {
    conditions.push(ilike(publishers.platform, platform))
  }

  if (createdMethod) {
    conditions.push(eq(publishers.createdMethod, createdMethod))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  // Get total count
  const [countResult] = await db
    .select({ value: count() })
    .from(publishers)
    .where(whereClause)

  const total = countResult?.value || 0

  // Get paginated data
  const rows = await db
    .select()
    .from(publishers)
    .where(whereClause)
    .orderBy(
      sortBy === "publisherName" || sortBy === "name"
        ? (sortOrder === "asc" ? asc(publishers.name) : desc(publishers.name))
        : sortBy === "platform"
        ? (sortOrder === "asc" ? asc(publishers.platform) : desc(publishers.platform))
        : sortBy === "createdAt"
        ? (sortOrder === "asc" ? asc(publishers.createdAt) : desc(publishers.createdAt))
        : desc(publishers.createdAt)
    )
    .limit(limit)
    .offset((page - 1) * limit)

  return {
    data: rows.map(mapPublisher),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

export async function getPublisher(id: string) {
  const [row] = await db.select().from(publishers).where(eq(publishers.id, id))
  return row ? mapPublisher(row) : null
}

export async function createPublisher(data: { name: string; contactEmail?: string; platform?: string }) {
  const [row] = await db.insert(publishers).values({
    name: data.name,
    contactEmail: data.contactEmail,
    platform: data.platform,
    createdMethod: "Manually",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning()

  return mapPublisher(row)
}

export async function updatePublisher(
  id: string,
  data: Partial<{
    name: string;
    contactEmail: string | null;
    status: "active" | "inactive" | "Active" | "Inactive";
    platform: string;
    brandGuidelines: any
  }>
) {
  const updateData: any = {
    updatedAt: new Date(),
  }

  if (data.name !== undefined) updateData.name = data.name
  if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail
  if (data.status !== undefined) updateData.status = data.status.toLowerCase()
  if (data.platform !== undefined) updateData.platform = data.platform

  // Note: brandGuidelines is likely stored separately or needs to be handled if added to schema
  // Assuming it's not in schema yet based on previous check, ignoring for now or adding if needed.
  // The schema update only added platform and createdMethod.

  const [row] = await db.update(publishers)
    .set(updateData)
    .where(eq(publishers.id, id))
    .returning()

  return row ? mapPublisher(row) : null
}

export async function softDeletePublisher(id: string) {
  await db.update(publishers).set({
    status: "inactive",
    updatedAt: new Date(),
  }).where(eq(publishers.id, id))
}
