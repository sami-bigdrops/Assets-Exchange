import { createId } from "@paralleldrive/cuid2";
import { eq, ilike, sql, and, or, count } from "drizzle-orm";

import type {
  Batch,
  BatchWithAssets,
  CreateBatchInput,
  UpdateBatchInput,
  ListBatchesFilters,
} from "@/features/admin/types/batch.types";
import { db } from "@/lib/db";
import { batches, batchAssets, assetsTable } from "@/lib/schema";

function mapBatch(
  row: typeof batches.$inferSelect,
  assetCount?: number
): Batch {
  return {
    id: row.id,
    batchLabel: row.batchLabel,
    description: row.description,
    status: row.status as "active" | "inactive" | "archived",
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    assetCount,
  };
}

export async function listBatches(
  filters: ListBatchesFilters = {}
): Promise<Batch[]> {
  const conditions = [];

  if (filters.status) {
    conditions.push(eq(batches.status, filters.status));
  }

  if (filters.createdBy) {
    conditions.push(eq(batches.createdBy, filters.createdBy));
  }

  if (filters.search) {
    conditions.push(
      or(
        ilike(batches.batchLabel, `%${filters.search}%`),
        ilike(batches.description ?? sql`''`, `%${filters.search}%`)
      )!
    );
  }

  const rows = await db
    .select({
      batch: batches,
      assetCount: sql<number>`COALESCE(${count(batchAssets.id)}, 0)`,
    })
    .from(batches)
    .leftJoin(batchAssets, eq(batches.id, batchAssets.batchId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(batches.id)
    .orderBy(sql`${batches.createdAt} DESC`);

  return rows.map((row) => mapBatch(row.batch, Number(row.assetCount)));
}

export async function getBatch(id: string): Promise<Batch | null> {
  const [row] = await db
    .select({
      batch: batches,
      assetCount: sql<number>`COALESCE(${count(batchAssets.id)}, 0)`,
    })
    .from(batches)
    .leftJoin(batchAssets, eq(batches.id, batchAssets.batchId))
    .where(eq(batches.id, id))
    .groupBy(batches.id)
    .limit(1);

  return row ? mapBatch(row.batch, Number(row.assetCount)) : null;
}

export async function getBatchWithAssets(
  id: string
): Promise<BatchWithAssets | null> {
  const batch = await getBatch(id);
  if (!batch) {
    return null;
  }

  const batchAssetsList = await db
    .select({
      asset: assetsTable,
    })
    .from(batchAssets)
    .innerJoin(assetsTable, eq(batchAssets.assetId, assetsTable.id))
    .where(eq(batchAssets.batchId, id))
    .orderBy(sql`${assetsTable.createdAt} DESC`);

  return {
    ...batch,
    assets: batchAssetsList.map((row) => ({
      id: row.asset.id,
      publisherId: row.asset.publisherId,
      status: row.asset.status,
      createdAt: row.asset.createdAt.toISOString(),
      approvedAt: row.asset.approvedAt?.toISOString() ?? null,
    })),
  };
}

export async function createBatch(data: CreateBatchInput): Promise<Batch> {
  const trimmedLabel = data.batchLabel.trim();
  if (trimmedLabel.length === 0) {
    throw new Error("Batch label cannot be empty");
  }

  const existingBatch = await db
    .select()
    .from(batches)
    .where(
      and(eq(batches.batchLabel, trimmedLabel), eq(batches.status, "active"))
    )
    .limit(1);

  if (existingBatch.length > 0) {
    throw new Error(`Batch with label "${trimmedLabel}" already exists`);
  }

  const insertValues = {
    id: createId(),
    batchLabel: trimmedLabel,
    description: data.description?.trim() || null,
    status: (data.status || "active") as "active" | "inactive" | "archived",
    createdBy: data.createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    const [row] = await db.insert(batches).values(insertValues).returning();
    if (!row) {
      throw new Error("Failed to create batch: no row returned");
    }
    return mapBatch(row);
  } catch (error) {
    if (error instanceof Error) {
      // Check for unique constraint violation
      if (
        error.message.includes("unique") ||
        error.message.includes("duplicate")
      ) {
        throw new Error(`Batch with label "${trimmedLabel}" already exists`);
      }
      throw error;
    }
    throw new Error("Failed to create batch: database error");
  }
}

export async function updateBatch(
  id: string,
  data: UpdateBatchInput
): Promise<Batch | null> {
  const existingBatch = await getBatch(id);
  if (!existingBatch) {
    return null;
  }

  const updateValues: Partial<typeof batches.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (data.batchLabel !== undefined) {
    const trimmedLabel = data.batchLabel.trim();

    if (trimmedLabel.length === 0) {
      throw new Error("Batch label cannot be empty");
    }

    const duplicateCheck = await db
      .select()
      .from(batches)
      .where(
        and(
          eq(batches.batchLabel, trimmedLabel),
          eq(batches.status, "active"),
          sql`${batches.id} != ${id}`
        )
      )
      .limit(1);

    if (duplicateCheck.length > 0) {
      throw new Error(`Batch with label "${trimmedLabel}" already exists`);
    }

    updateValues.batchLabel = trimmedLabel;
  }

  if (data.description !== undefined) {
    updateValues.description = data.description?.trim() || null;
  }

  if (data.status !== undefined) {
    updateValues.status = data.status;
  }

  try {
    const [row] = await db
      .update(batches)
      .set(updateValues)
      .where(eq(batches.id, id))
      .returning();

    if (!row) {
      return null;
    }
    return mapBatch(row);
  } catch (error) {
    if (error instanceof Error) {
      // Check for unique constraint violation
      if (
        error.message.includes("unique") ||
        error.message.includes("duplicate")
      ) {
        throw new Error(
          `Batch with label "${updateValues.batchLabel}" already exists`
        );
      }
      throw new Error(`Failed to update batch: ${error.message}`);
    }
    throw new Error("Failed to update batch: database error");
  }
}

export async function deactivateBatch(id: string): Promise<Batch | null> {
  const batch = await getBatch(id);
  if (!batch) {
    return null;
  }

  const [row] = await db
    .update(batches)
    .set({
      status: "inactive",
      updatedAt: new Date(),
    })
    .where(eq(batches.id, id))
    .returning();

  return row ? mapBatch(row) : null;
}

export async function deleteBatch(id: string): Promise<boolean> {
  const batch = await getBatch(id);
  if (!batch) {
    return false;
  }

  if (batch.status === "active") {
    throw new Error("Cannot delete active batch. Please deactivate it first.");
  }

  try {
    await db.transaction(async (tx) => {
      await tx.delete(batchAssets).where(eq(batchAssets.batchId, id));
      await tx.delete(batches).where(eq(batches.id, id));
    });

    return true;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to delete batch");
  }
}

export async function removeAssetFromBatch(
  batchId: string,
  assetId: string
): Promise<Batch> {
  const batch = await getBatch(batchId);
  if (!batch) {
    throw new Error("Batch not found");
  }

  const asset = await db
    .select()
    .from(assetsTable)
    .where(eq(assetsTable.id, assetId))
    .limit(1);

  if (asset.length === 0) {
    throw new Error("Asset not found");
  }

  const existingAssignment = await db
    .select()
    .from(batchAssets)
    .where(
      and(eq(batchAssets.batchId, batchId), eq(batchAssets.assetId, assetId))
    )
    .limit(1);

  if (existingAssignment.length === 0) {
    throw new Error("Asset is not assigned to this batch");
  }

  try {
    const deleteResult = await db
      .delete(batchAssets)
      .where(
        and(eq(batchAssets.batchId, batchId), eq(batchAssets.assetId, assetId))
      )
      .returning();

    if (deleteResult.length === 0) {
      throw new Error("Asset is not assigned to this batch");
    }

    const updatedBatch = await getBatch(batchId);
    if (!updatedBatch) {
      throw new Error("Failed to retrieve updated batch after removal");
    }

    return updatedBatch;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to remove asset from batch: database error");
  }
}

export async function moveAssetBetweenBatches(
  fromBatchId: string,
  toBatchId: string,
  assetId: string
): Promise<{ fromBatch: Batch; toBatch: Batch }> {
  if (fromBatchId === toBatchId) {
    throw new Error("Source and destination batches cannot be the same");
  }

  const fromBatch = await getBatch(fromBatchId);
  if (!fromBatch) {
    throw new Error("Source batch not found");
  }

  const toBatch = await getBatch(toBatchId);
  if (!toBatch) {
    throw new Error("Destination batch not found");
  }

  const asset = await db
    .select()
    .from(assetsTable)
    .where(eq(assetsTable.id, assetId))
    .limit(1);

  if (asset.length === 0) {
    throw new Error("Asset not found");
  }

  const existingAssignment = await db
    .select()
    .from(batchAssets)
    .where(
      and(
        eq(batchAssets.batchId, fromBatchId),
        eq(batchAssets.assetId, assetId)
      )
    )
    .limit(1);

  if (existingAssignment.length === 0) {
    throw new Error("Asset is not assigned to the source batch");
  }

  const duplicateCheck = await db
    .select()
    .from(batchAssets)
    .where(
      and(eq(batchAssets.batchId, toBatchId), eq(batchAssets.assetId, assetId))
    )
    .limit(1);

  if (duplicateCheck.length > 0) {
    throw new Error("Asset is already assigned to the destination batch");
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .delete(batchAssets)
        .where(
          and(
            eq(batchAssets.batchId, fromBatchId),
            eq(batchAssets.assetId, assetId)
          )
        );

      await tx.insert(batchAssets).values({
        id: createId(),
        batchId: toBatchId,
        assetId,
        createdAt: new Date(),
      });
    });

    const updatedFromBatch = await getBatch(fromBatchId);
    const updatedToBatch = await getBatch(toBatchId);

    if (!updatedFromBatch || !updatedToBatch) {
      throw new Error("Failed to retrieve updated batches");
    }

    return {
      fromBatch: updatedFromBatch,
      toBatch: updatedToBatch,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to move asset between batches");
  }
}
