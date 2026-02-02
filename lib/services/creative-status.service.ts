import { eq, sql, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { creatives } from "@/lib/schema";

export type CreativeStatusUpdate = {
  status: string;
  scanError?: string | null;
};

export async function updateCreativeStatus(
  creativeId: string,
  update: CreativeStatusUpdate
): Promise<void> {
  const now = new Date();
  const isScanning =
    update.status === "SCANNING" || update.status === "scanning";
  const isScanFailure =
    update.status === "failed" ||
    update.status === "FAILED" ||
    update.scanError != null;

  const updateData: {
    status: string;
    statusUpdatedAt: Date;
    scanAttempts?: ReturnType<typeof sql>;
    lastScanError?: string | null;
    updatedAt: Date;
  } = {
    status: update.status,
    statusUpdatedAt: now,
    updatedAt: now,
  };

  if (isScanning) {
    await db
      .update(creatives)
      .set({
        ...updateData,
        scanAttempts: sql`${creatives.scanAttempts} + 1`,
      })
      .where(eq(creatives.id, creativeId));
  } else if (isScanFailure) {
    await db
      .update(creatives)
      .set({
        ...updateData,
        lastScanError: update.scanError ?? null,
      })
      .where(eq(creatives.id, creativeId));
  } else {
    await db
      .update(creatives)
      .set(updateData)
      .where(eq(creatives.id, creativeId));
  }
}

export async function updateCreativeStatuses(
  creativeIds: string[],
  update: CreativeStatusUpdate
): Promise<void> {
  if (creativeIds.length === 0) return;

  const now = new Date();
  const isScanning =
    update.status === "SCANNING" || update.status === "scanning";
  const isScanFailure =
    update.status === "failed" ||
    update.status === "FAILED" ||
    update.scanError != null;

  const updateData: {
    status: string;
    statusUpdatedAt: Date;
    scanAttempts?: ReturnType<typeof sql>;
    lastScanError?: string | null;
    updatedAt: Date;
  } = {
    status: update.status,
    statusUpdatedAt: now,
    updatedAt: now,
  };

  if (isScanning) {
    await db
      .update(creatives)
      .set({
        ...updateData,
        scanAttempts: sql`${creatives.scanAttempts} + 1`,
      })
      .where(inArray(creatives.id, creativeIds));
  } else if (isScanFailure) {
    await db
      .update(creatives)
      .set({
        ...updateData,
        lastScanError: update.scanError ?? null,
      })
      .where(inArray(creatives.id, creativeIds));
  } else {
    await db
      .update(creatives)
      .set(updateData)
      .where(inArray(creatives.id, creativeIds));
  }
}
