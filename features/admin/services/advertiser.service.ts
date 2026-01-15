import { eq, ilike, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { advertisers } from "@/lib/schema"

import type { Advertiser } from "../types/advertiser.types"

function mapAdvertiser(row: typeof advertisers.$inferSelect): Advertiser {
  return {
    id: row.id,
    advertiserId: row.everflowAdvertiserId ? String(row.everflowAdvertiserId) : row.id,
    name: row.name,
    advertiserName: row.name,
    advPlatform: row.everflowAdvertiserId ? "Everflow" : "",
    createdMethod: row.everflowAdvertiserId ? ("API" as const) : ("Manually" as const),
    contactEmail: row.contactEmail,
    status: row.status as "active" | "inactive",
    everflowAdvertiserId: row.everflowAdvertiserId ? String(row.everflowAdvertiserId) : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } as Advertiser;
}

export async function listAdvertisers({ search }: { search?: string }) {
  const rows = await db
    .select()
    .from(advertisers)
    .where(search ? ilike(advertisers.name, `%${search}%`) : undefined)
    .orderBy(sql`${advertisers.createdAt} DESC`)

  return rows.map(mapAdvertiser)
}

export async function getAdvertiser(id: string) {
  const [row] = await db.select().from(advertisers).where(eq(advertisers.id, id))
  return row ? mapAdvertiser(row) : null
}

export async function createAdvertiser(data: { id?: string; name: string; contactEmail?: string }) {
  const insertValues: {
    name: string;
    contactEmail?: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    id?: string;
  } = {
    name: data.name,
    contactEmail: data.contactEmail,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (data.id) {
    insertValues.id = data.id;
  }

  const [row] = await db.insert(advertisers).values(insertValues).returning()

  return mapAdvertiser(row)
}

export async function updateAdvertiser(
  id: string,
  data: Partial<{ name: string; contactEmail: string; status: "active" | "inactive" }>
) {
  const [row] = await db.update(advertisers).set({
    name: data.name,
    contactEmail: data.contactEmail,
    status: data.status,
    updatedAt: new Date(),
  }).where(eq(advertisers.id, id)).returning()

  return row ? mapAdvertiser(row) : null
}

export async function softDeleteAdvertiser(id: string) {
  await db.update(advertisers).set({
    status: "inactive",
    updatedAt: new Date(),
  }).where(eq(advertisers.id, id))
}
