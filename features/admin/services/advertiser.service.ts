import { eq, ilike, sql } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { advertisers, user } from "@/lib/schema";

import type { Advertiser } from "../types/advertiser.types";

function mapAdvertiser(row: typeof advertisers.$inferSelect): Advertiser {
  return {
    id: row.id,
    advertiserId: row.everflowAdvertiserId
      ? String(row.everflowAdvertiserId)
      : row.id,
    name: row.name,
    advertiserName: row.name,
    advPlatform: row.everflowAdvertiserId ? "Everflow" : "",
    createdMethod: row.everflowAdvertiserId
      ? ("API" as const)
      : ("Manually" as const),
    contactEmail: row.contactEmail,
    status: row.status as "active" | "inactive",
    everflowAdvertiserId: row.everflowAdvertiserId
      ? String(row.everflowAdvertiserId)
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } as Advertiser;
}

async function upsertAdvertiserUser(
  email: string,
  password: string,
  name: string
): Promise<string> {
  // console.log(`[AdvertiserService] Upserting user record for: ${email}`);

  const existingUsers = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (existingUsers.length > 0) {
    const existingUser = existingUsers[0];
    // console.log(`[AdvertiserService] User exists (ID: ${existingUser.id}), updating role and name`);

    await db
      .update(user)
      .set({
        role: "advertiser",
        name: name || existingUser.name,
        updatedAt: new Date(),
      })
      .where(eq(user.id, existingUser.id));

    return existingUser.id;
  }

  // console.log(`[AdvertiserService] User does not exist, creating new account via BetterAuth`);

  const signUpResult = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name,
    },
    headers: new Headers(),
  });

  if (!signUpResult.user) {
    console.error(
      `[AdvertiserService] signUpEmail failed: No user returned in result`,
      signUpResult
    );
    throw new Error(
      "Failed to create user account through authentication service"
    );
  }

  // console.log(`[AdvertiserService] User created (ID: ${signUpResult.user.id}), setting role to advertiser`);

  await db
    .update(user)
    .set({ role: "advertiser", updatedAt: new Date() })
    .where(eq(user.id, signUpResult.user.id));

  return signUpResult.user.id;
}

export async function listAdvertisers({ search }: { search?: string }) {
  const rows = await db
    .select()
    .from(advertisers)
    .where(search ? ilike(advertisers.name, `%${search}%`) : undefined)
    .orderBy(sql`${advertisers.createdAt} DESC`);

  return rows.map(mapAdvertiser);
}

export async function getAdvertiser(id: string) {
  const [row] = await db
    .select()
    .from(advertisers)
    .where(eq(advertisers.id, id));
  return row ? mapAdvertiser(row) : null;
}

export async function createAdvertiser(data: {
  id?: string;
  name: string;
  contactEmail?: string;
}) {
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

  const [row] = await db.insert(advertisers).values(insertValues).returning();

  return mapAdvertiser(row);
}

export async function updateAdvertiser(
  id: string,
  data: Partial<{
    name: string;
    contactEmail: string;
    status: "active" | "inactive";
    password: string;
  }>
) {
  // console.log(`[AdvertiserService] updateAdvertiser called for ID ${id} with data:`, JSON.stringify(data));

  const [row] = await db
    .update(advertisers)
    .set({
      name: data.name,
      contactEmail: data.contactEmail,
      status: data.status,
      updatedAt: new Date(),
    })
    .where(eq(advertisers.id, id))
    .returning();

  if (!row) return null;

  if (data.contactEmail && data.password) {
    // console.log(`[AdvertiserService] Found both email (${data.contactEmail}) and password in payload. Triggering upsertAdvertiserUser...`);
    try {
      await upsertAdvertiserUser(
        data.contactEmail,
        data.password,
        data.name || row.name
      );
    } catch (err) {
      console.error(
        "[AdvertiserService] Failed to create/update advertiser user account:",
        err
      );
      throw err;
    }
  } else {
    // console.log(`[AdvertiserService] Skipping user upsert. Payload fields: contactEmail=${!!data.contactEmail}, password=${!!data.password}`);
  }

  return mapAdvertiser(row);
}

export async function softDeleteAdvertiser(id: string) {
  await db
    .update(advertisers)
    .set({
      status: "inactive",
      updatedAt: new Date(),
    })
    .where(eq(advertisers.id, id));
}
