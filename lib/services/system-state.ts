import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { systemStates } from "@/lib/schema";

export async function getSystemState<T>(key: string): Promise<T | null> {
  const result = await db
    .select()
    .from(systemStates)
    .where(eq(systemStates.key, key));
  if (result.length === 0) return null;
  return result[0].value as T;
}

export async function setSystemState<T>(key: string, value: T): Promise<void> {
  await db
    .insert(systemStates)
    .values({
      key,
      value: value as unknown,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: systemStates.key,
      set: {
        value: value as unknown,
        updatedAt: new Date(),
      },
    });
}
