import { eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { batchAssets, batches } from "@/lib/schema";

/**
 * Batch Analytics Service
 *
 * Provides utilities for automatically setting batch_id when inserting impressions/clicks
 * for assets that belong to batches.
 *
 * Data Flow:
 * 1. When inserting an impression/click for an asset_id:
 *    - Service queries batch_assets table to find if asset belongs to a batch
 *    - If found, automatically sets batch_id in the insert
 *    - If not found, batch_id remains NULL (asset not in any batch)
 *
 * 2. Safety Checks:
 *    - Validates batch_id exists in batches table before insertion
 *    - Prevents invalid batch_ids from being inserted (database FK also enforces this)
 *    - Returns null if batch_id is invalid (graceful degradation)
 *
 * 3. Performance:
 *    - Uses indexed queries on batch_assets.asset_id for fast lookups
 *    - Caches batch_id lookup per asset_id within a request (optional optimization)
 */

/**
 * Get batch_id for an asset
 *
 * Queries batch_assets table to find which batch (if any) contains this asset.
 * Returns the batch_id if found, null otherwise.
 *
 * @param assetId - The asset ID to look up
 * @returns batch_id if asset belongs to a batch, null otherwise
 */
export async function getBatchIdForAsset(
  assetId: string
): Promise<string | null> {
  try {
    const batchAsset = await db
      .select({
        batchId: batchAssets.batchId,
      })
      .from(batchAssets)
      .where(eq(batchAssets.assetId, assetId))
      .limit(1);

    return batchAsset[0]?.batchId ?? null;
  } catch (error) {
    console.error(`Error looking up batch_id for asset ${assetId}:`, error);
    return null;
  }
}

/**
 * Validate that a batch_id exists in the batches table
 *
 * Safety check to ensure batch_id is valid before insertion.
 * Database foreign key constraint also enforces this, but this provides
 * application-level validation for better error messages.
 *
 * @param batchId - The batch ID to validate
 * @returns true if batch exists, false otherwise
 */
export async function validateBatchId(batchId: string): Promise<boolean> {
  try {
    const batch = await db
      .select({
        id: batches.id,
      })
      .from(batches)
      .where(eq(batches.id, batchId))
      .limit(1);

    return batch.length > 0;
  } catch (error) {
    console.error(`Error validating batch_id ${batchId}:`, error);
    return false;
  }
}

/**
 * Get batch_id for an asset with validation
 *
 * Combines lookup and validation. Returns batch_id only if:
 * 1. Asset belongs to a batch (found in batch_assets)
 * 2. Batch exists and is valid (found in batches table)
 *
 * This ensures data integrity at the application level before database insertion.
 *
 * @param assetId - The asset ID to look up
 * @returns batch_id if valid, null otherwise
 */
export async function getValidatedBatchIdForAsset(
  assetId: string
): Promise<string | null> {
  const batchId = await getBatchIdForAsset(assetId);

  if (!batchId) {
    return null;
  }

  const isValid = await validateBatchId(batchId);

  if (!isValid) {
    console.warn(
      `Batch ${batchId} not found in batches table for asset ${assetId}. ` +
        `This may indicate data inconsistency.`
    );
    return null;
  }

  return batchId;
}

/**
 * Prepare impression/click insert data with automatic batch_id
 *
 * Helper function that enriches insert data with batch_id when asset belongs to a batch.
 * Use this when inserting impressions or clicks to automatically include batch_id.
 *
 * Example usage:
 * ```typescript
 * const data = await prepareAnalyticsInsert({
 *   asset_id: "asset123",
 *   // ... other impression/click fields
 * });
 *
 * await db.insert(impressions).values(data);
 * ```
 *
 * @param data - Insert data with asset_id (or assetId)
 * @returns Data enriched with batch_id if asset belongs to a batch
 */
export async function prepareAnalyticsInsert<
  T extends { asset_id?: string; assetId?: string },
>(data: T): Promise<T & { batch_id?: string | null }> {
  const assetId = data.asset_id ?? data.assetId;

  if (!assetId) {
    return { ...data, batch_id: null };
  }

  const batchId = await getValidatedBatchIdForAsset(assetId);

  return {
    ...data,
    batch_id: batchId ?? null,
  };
}

/**
 * Bulk get batch_ids for multiple assets
 *
 * Optimized version for bulk operations. Queries all batch_ids for multiple assets
 * in a single database query.
 *
 * @param assetIds - Array of asset IDs to look up
 * @returns Map of asset_id -> batch_id (or null if not in a batch)
 */
export async function getBatchIdsForAssets(
  assetIds: string[]
): Promise<Map<string, string | null>> {
  if (assetIds.length === 0) {
    return new Map();
  }

  try {
    const batchAssetsList = await db
      .select({
        assetId: batchAssets.assetId,
        batchId: batchAssets.batchId,
      })
      .from(batchAssets)
      .where(inArray(batchAssets.assetId, assetIds));

    const result = new Map<string, string | null>();

    for (const assetId of assetIds) {
      const batchAsset = batchAssetsList.find((ba) => ba.assetId === assetId);
      result.set(assetId, batchAsset?.batchId ?? null);
    }

    return result;
  } catch (error) {
    console.error(`Error bulk looking up batch_ids for assets:`, error);
    const result = new Map<string, string | null>();
    for (const assetId of assetIds) {
      result.set(assetId, null);
    }
    return result;
  }
}
