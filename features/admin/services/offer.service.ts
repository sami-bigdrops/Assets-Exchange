import { eq, ilike, sql, and } from "drizzle-orm";

import type { Offer } from "@/features/admin/types/offer.types";
import { db } from "@/lib/db";
import { offers, advertisers } from "@/lib/schema";

function mapOffer(row: typeof offers.$inferSelect): Offer {
  return {
    id: row.id,
    offerId: (row as { everflowOfferId?: string }).everflowOfferId || row.id,
    name: row.offerName,
    offerName: row.offerName,
    advertiserId: row.advertiserId,
    advName: row.advertiserName,
    status: row.status as "Active" | "Inactive",
    visibility: row.visibility as "Public" | "Internal" | "Hidden",
    createdMethod: row.createdMethod as "API" | "Manually",
    brandGuidelinesFileId:
      (row.brandGuidelines as { fileUrl?: string } | null)?.fileUrl ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listOffers({
  search,
  status,
  advertiserId,
}: {
  search?: string;
  status?: "Active" | "Inactive";
  advertiserId?: string;
}) {
  try {
    const conditions = [];

    if (status) {
      conditions.push(eq(offers.status, status));
    } else {
      conditions.push(eq(offers.status, "Active"));
    }

    if (search) {
      conditions.push(ilike(offers.offerName, `%${search}%`));
    }

    if (advertiserId) {
      conditions.push(eq(offers.advertiserId, advertiserId));
    }

    const rows = await db
      .select()
      .from(offers)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${offers.createdAt} DESC`);

    return rows.map(mapOffer);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);

    // Handle Neon/Postgres compute quota error
    if (msg.includes("compute time quota") || msg.includes("compute time")) {
      throw {
        status: 503,
        message: "Service temporarily unavailable due to high load",
        code: "COMPUTE_QUOTA_EXCEEDED",
      };
    }

    // Normalize and rethrow other errors
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(msg);
  }
}

export async function getOffer(id: string) {
  const [row] = await db.select().from(offers).where(eq(offers.id, id));
  return row ? mapOffer(row) : null;
}

export async function createOffer(data: {
  id?: string;
  name: string;
  advertiserId: string;
  status?: "Active" | "Inactive";
  visibility?: "Public" | "Internal" | "Hidden";
  brandGuidelinesFileId?: string;
}) {
  const [advertiser] = await db
    .select()
    .from(advertisers)
    .where(eq(advertisers.id, data.advertiserId));
  if (!advertiser) {
    throw new Error("Advertiser not found");
  }
  const insertValues: {
    id?: string;
    offerName: string;
    advertiserId: string;
    advertiserName: string;
    status: "Active" | "Inactive";
    visibility: "Public" | "Internal" | "Hidden";
    createdMethod: "Manually" | "API";
    brandGuidelines?: {
      type: "url" | "file" | "text" | null;
      url?: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
      text?: string;
      notes?: string;
    } | null;
    createdAt: Date;
    updatedAt: Date;
  } = {
    offerName: data.name,
    advertiserId: data.advertiserId,
    advertiserName: advertiser.name,
    status: data.status || "Active",
    visibility: data.visibility || "Public",
    createdMethod: "Manually",
    brandGuidelines: data.brandGuidelinesFileId
      ? { type: "file", fileUrl: data.brandGuidelinesFileId }
      : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (data.id) {
    insertValues.id = data.id;
  }

  const [row] = await db.insert(offers).values(insertValues).returning();

  return mapOffer(row);
}

export async function updateOffer(
  id: string,
  data: Partial<{
    name: string;
    status: "Active" | "Inactive";
    visibility: "Public" | "Internal" | "Hidden";
    advertiserId: string;
    brandGuidelinesFileId: string | null;
  }>
) {
  let advertiserName = undefined;
  if (data.advertiserId) {
    const [advertiser] = await db
      .select()
      .from(advertisers)
      .where(eq(advertisers.id, data.advertiserId));
    if (advertiser) {
      advertiserName = advertiser.name;
    }
  }

  const [row] = await db
    .update(offers)
    .set({
      offerName: data.name,
      status: data.status,
      visibility: data.visibility,
      advertiserId: data.advertiserId,
      advertiserName,
      brandGuidelines:
        data.brandGuidelinesFileId !== undefined
          ? data.brandGuidelinesFileId
            ? { type: "file" as const, fileUrl: data.brandGuidelinesFileId }
            : null
          : undefined,
      updatedAt: new Date(),
    })
    .where(eq(offers.id, id))
    .returning();

  return row ? mapOffer(row) : null;
}

export async function softDeleteOffer(id: string) {
  await db
    .update(offers)
    .set({
      status: "Inactive",
      updatedAt: new Date(),
    })
    .where(eq(offers.id, id));
}

export async function bulkUpdateOffers(
  offerIds: string[],
  updates: {
    visibility?: "Public" | "Internal" | "Hidden";
    brandGuidelines?: {
      type: "url" | "file" | "text" | null;
      url?: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
      text?: string;
      notes?: string;
    } | null;
  }
) {
  const results = {
    successful: [] as string[],
    failed: [] as Array<{ offerId: string; error: string; reason: string }>,
  };

  for (const id of offerIds) {
    try {
      const set: {
        updatedAt: Date;
        visibility?: "Public" | "Internal" | "Hidden";
        brandGuidelines?: {
          type: "url" | "file" | "text" | null;
          url?: string;
          fileUrl?: string;
          fileName?: string;
          fileSize?: number;
          mimeType?: string;
          text?: string;
          notes?: string;
        } | null;
      } = { updatedAt: new Date() };
      if (updates.visibility) set.visibility = updates.visibility;
      if (updates.brandGuidelines !== undefined)
        set.brandGuidelines = updates.brandGuidelines;

      const [row] = await db
        .update(offers)
        .set(set)
        .where(eq(offers.id, id))
        .returning();

      if (row) {
        results.successful.push(id);
      } else {
        results.failed.push({
          offerId: id,
          error: "Not found",
          reason: "Offer does not exist",
        });
      }
    } catch (e: unknown) {
      results.failed.push({
        offerId: id,
        error: "Update failed",
        reason: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return {
    success: results.failed.length === 0,
    updated: results.successful.length,
    failed: results.failed.length,
    results,
    message: `Updated ${results.successful.length} offers, ${results.failed.length} failed`,
  };
}
