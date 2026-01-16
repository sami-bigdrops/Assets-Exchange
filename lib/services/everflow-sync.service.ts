import "server-only";

import { eq, desc } from "drizzle-orm";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { advertisers, offers, syncHistory } from "@/lib/schema";

import { getEverflowService } from "./everflow.service";


interface EverflowOffer {
  network_offer_id: number;
  network_advertiser_id: number;
  network_advertiser_name?: string;
  name: string;
  offer_status: string;
  relationship?: {
    advertiser?: {
      network_advertiser_id?: number;
      name?: string;
    };
  };
  [key: string]: unknown;
}

interface SyncOptions {
  conflictResolution?: "skip" | "update" | "merge";
  filters?: {
    status?: string;
    advertiserId?: string;
    limit?: number;
  };
  dryRun?: boolean;
  onProgress?: (progress: { current: number; total: number; stage: string }) => Promise<void>;
  onEvent?: (event: { type: string; message?: string; data?: any }) => Promise<void>;
}

interface SyncResult {
  syncId: string;
  status: "completed" | "failed";
  totalRecords: number;
  syncedRecords: number;
  createdRecords: number;
  updatedRecords: number;
  skippedRecords: number;
  failedRecords: number;
  errors: Array<{ offerId: number; error: string }>;
}

/**
 * Maps Everflow offer status to local offer status
 */
function mapEverflowStatus(everflowStatus: string): "Active" | "Inactive" {
  const statusMap: Record<string, "Active" | "Inactive"> = {
    active: "Active",
    paused: "Inactive",
    pending: "Inactive",
    deleted: "Inactive",
  };

  return statusMap[everflowStatus.toLowerCase()] || "Inactive";
}

/**
 * Maps Everflow offer to local offer format
 */
function mapEverflowOfferToLocal(
  everflowOffer: EverflowOffer,
  userId: string
): {
  offerName: string;
  advertiserId: string;
  advertiserName: string;
  status: "Active" | "Inactive";
  createdMethod: "API";
  everflowOfferId: string;
  everflowAdvertiserId: string;
  everflowData: Record<string, unknown>;
  updatedBy: string;
} {
  const advertiserName =
    everflowOffer.network_advertiser_name ||
    everflowOffer.relationship?.advertiser?.name ||
    `Advertiser ${everflowOffer.network_advertiser_id}`;

  return {
    offerName: everflowOffer.name || `Offer ${everflowOffer.network_offer_id}`,
    advertiserId: String(everflowOffer.network_advertiser_id),
    advertiserName,
    status: mapEverflowStatus(everflowOffer.offer_status),
    createdMethod: "API",
    everflowOfferId: String(everflowOffer.network_offer_id),
    everflowAdvertiserId: String(everflowOffer.network_advertiser_id),
    everflowData: everflowOffer as Record<string, unknown>,
    updatedBy: userId,
  };
}

/**
 * Syncs offers from Everflow API to local database
 */
export async function syncOffersFromEverflow(
  userId: string,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const {
    conflictResolution = "update",
    filters = {},
    dryRun = false,
  } = options;

  const everflowService = getEverflowService();
  const syncId = crypto.randomUUID();

  await db
    .insert(syncHistory)
    .values({
      id: syncId,
      syncType: "offers",
      status: "in_progress",
      startedBy: userId,
      syncOptions: {
        conflictResolution,
        filters,
        limit: filters.limit,
      },
    });

  logger.everflow.info(`Starting offers sync - syncId: ${syncId}, userId: ${userId}, options: ${JSON.stringify(options)}`);

  const errors: Array<{ offerId: number; error: string }> = [];
  let totalRecords = 0;
  let syncedRecords = 0;
  let createdRecords = 0;
  let updatedRecords = 0;
  let skippedRecords = 0;
  let failedRecords = 0;

  try {
    const pageSize = filters.limit || 200;
    let allEverflowOffers: EverflowOffer[] = [];
    let totalPages = 1;
    let totalCount = 0;
    let actualPageSize = pageSize;

    const extractOffersAndPaging = (response: unknown): { offers: EverflowOffer[]; paging?: { page: number; page_size: number; total_count: number } } => {
      let offers: EverflowOffer[] = [];
      let paging: { page: number; page_size: number; total_count: number } | undefined;

      if (Array.isArray(response)) {
        offers = response as EverflowOffer[];
      } else if (response && typeof response === "object") {
        const resp = response as Record<string, unknown>;

        if ("paging" in resp && resp.paging && typeof resp.paging === "object") {
          const pagingObj = resp.paging as Record<string, unknown>;
          paging = {
            page: (pagingObj.page as number) || 1,
            page_size: (pagingObj.page_size as number) || pageSize,
            total_count: (pagingObj.total_count as number) || 0,
          };
        }

        if ("data" in resp && resp.data && typeof resp.data === "object") {
          const data = resp.data as Record<string, unknown>;
          if (Array.isArray(data.offers)) {
            offers = data.offers as EverflowOffer[];
          } else if (Array.isArray(data.entries)) {
            offers = data.entries as EverflowOffer[];
          } else if (Array.isArray(data)) {
            offers = data as EverflowOffer[];
          }
        } else if (Array.isArray(resp.offers)) {
          offers = resp.offers as EverflowOffer[];
        } else if (Array.isArray(resp.entries)) {
          offers = resp.entries as EverflowOffer[];
        } else if (Array.isArray(resp.data)) {
          offers = resp.data as EverflowOffer[];
        }
      }

      return { offers, paging };
    };

    const firstResponse = await everflowService.getOffers({
      page: 1,
      limit: pageSize,
      advertiserId: filters.advertiserId,
      status: filters.status,
    });

    const { offers: firstPageOffers, paging: firstPaging } = extractOffersAndPaging(firstResponse);

    if (firstPaging) {
      totalCount = firstPaging.total_count;
      actualPageSize = firstPaging.page_size;
      totalPages = Math.ceil(totalCount / actualPageSize);
      logger.everflow.info(`Extracted pagination info from Everflow response - syncId: ${syncId}, totalCount: ${firstPaging.total_count}, pageSize: ${firstPaging.page_size}, totalPages: ${totalPages}, currentPage: ${firstPaging.page}`);
    } else {
      totalCount = firstPageOffers.length;
      totalPages = firstPageOffers.length === pageSize ? 2 : 1; // If we got full page, there might be more
      logger.everflow.warn(`No paging object in Everflow response, using fallback - syncId: ${syncId}, offersReceived: ${firstPageOffers.length}, pageSize: ${pageSize}, assumedTotalPages: ${totalPages}`);
    }

    allEverflowOffers = [...firstPageOffers];
    logger.everflow.info(`Fetched first page from Everflow - syncId: ${syncId}, page: 1, offersInPage: ${firstPageOffers.length}, totalCount: ${totalCount}, totalPages: ${totalPages}, actualPageSize: ${actualPageSize}`);

    if (totalPages > 1) {
      for (let currentPage = 2; currentPage <= totalPages; currentPage++) {
        if (allEverflowOffers.length >= totalCount && totalCount > 0) {
          logger.everflow.warn(`Stopping pagination - already fetched all unique offers - syncId: ${syncId}, currentPage: ${currentPage}, totalPages: ${totalPages}, fetchedSoFar: ${allEverflowOffers.length}, totalCount: ${totalCount}`);
          break;
        }

        logger.everflow.info(`Fetching page from Everflow - syncId: ${syncId}, page: ${currentPage}, totalPages: ${totalPages}, fetchedSoFar: ${allEverflowOffers.length}, totalCount: ${totalCount}`);

        const pageResponse = await everflowService.getOffers({
          page: currentPage,
          limit: actualPageSize,
          advertiserId: filters.advertiserId,
          status: filters.status,
        });

        const { offers: pageOffers } = extractOffersAndPaging(pageResponse);

        allEverflowOffers = [...allEverflowOffers, ...pageOffers];
        logger.everflow.info(`Fetched page from Everflow - syncId: ${syncId}, page: ${currentPage}, offersInPage: ${pageOffers.length}, totalFetched: ${allEverflowOffers.length}, totalCount: ${totalCount}`);

        if (pageOffers.length < actualPageSize) {
          logger.everflow.info(`Received fewer offers than page size, likely last page - syncId: ${syncId}, page: ${currentPage}, offersReceived: ${pageOffers.length}, pageSize: ${actualPageSize}`);
        }

        if (pageOffers.length === 0) {
          logger.everflow.warn(`Received 0 offers, stopping pagination - syncId: ${syncId}, page: ${currentPage}`);
          break;
        }
      }
    }

    const uniqueOffersMap = new Map<number, EverflowOffer>();
    for (const offer of allEverflowOffers) {
      const offerId = offer.network_offer_id;
      if (!uniqueOffersMap.has(offerId)) {
        uniqueOffersMap.set(offerId, offer);
      } else {
        logger.everflow.warn(`Duplicate offer detected, keeping first occurrence - syncId: ${syncId}, offerId: ${offerId}, offerName: ${offer.name}`);
      }
    }

    const everflowOffers = Array.from(uniqueOffersMap.values());
    totalRecords = everflowOffers.length;

    logger.everflow.info(`Fetched and deduplicated offers from Everflow - syncId: ${syncId}, totalFetched: ${allEverflowOffers.length}, totalUnique: ${totalRecords}, duplicatesRemoved: ${allEverflowOffers.length - totalRecords}`);

    if (options.onProgress && totalRecords > 0) {
      await options.onProgress({ current: 0, total: totalRecords, stage: `Fetched ${totalRecords} offers, starting sync` });
    } else if (options.onProgress) {
      await options.onProgress({ current: 0, total: 0, stage: "No offers found" });
    }

    if (dryRun) {
      logger.everflow.info(`Dry run mode - skipping database operations - syncId: ${syncId}, totalRecords: ${totalRecords}`);

      await db
        .update(syncHistory)
        .set({
          status: "completed",
          totalRecords,
          syncedRecords: 0,
          completedAt: new Date(),
        })
        .where(eq(syncHistory.id, syncId));

      return {
        syncId,
        status: "completed",
        totalRecords,
        syncedRecords: 0,
        createdRecords: 0,
        updatedRecords: 0,
        skippedRecords: 0,
        failedRecords: 0,
        errors: [],
      };
    }

    let processedCount = 0;
    for (const everflowOffer of everflowOffers) {
      try {
        const mappedOffer = mapEverflowOfferToLocal(everflowOffer, userId);

        const [existingOffer] = await db
          .select()
          .from(offers)
          .where(eq(offers.everflowOfferId, mappedOffer.everflowOfferId))
          .limit(1);

        if (existingOffer) {
          if (conflictResolution === "skip") {
            skippedRecords++;
            processedCount++;
            if (options.onProgress && (processedCount % 5 === 0 || processedCount === totalRecords)) {
              await options.onProgress({ current: processedCount, total: totalRecords, stage: "Processing offers" });
            }
            logger.everflow.info(`Skipping existing offer - syncId: ${syncId}, offerId: ${mappedOffer.everflowOfferId}`);
            continue;
          }

          if (conflictResolution === "update") {
            await db
              .update(offers)
              .set({
                offerName: mappedOffer.offerName,
                advertiserId: mappedOffer.advertiserId,
                advertiserName: mappedOffer.advertiserName,
                status: mappedOffer.status,
                everflowAdvertiserId: mappedOffer.everflowAdvertiserId,
                everflowData: mappedOffer.everflowData,
                updatedBy: mappedOffer.updatedBy,
                updatedAt: new Date(),
              })
              .where(eq(offers.id, existingOffer.id));

            updatedRecords++;
            syncedRecords++;
            processedCount++;
            if (options.onProgress && (processedCount % 5 === 0 || processedCount === totalRecords)) {
              await options.onProgress({ current: processedCount, total: totalRecords, stage: "Processing offers" });
            }
            logger.everflow.info(`Updated existing offer - syncId: ${syncId}, offerId: ${mappedOffer.everflowOfferId}`);
          } else if (conflictResolution === "merge") {
            const everflowUpdated = everflowOffer.time_saved
              ? new Date((everflowOffer.time_saved as number) * 1000)
              : null;
            const localUpdated = existingOffer.updatedAt;

            if (!everflowUpdated || everflowUpdated > localUpdated) {
              await db
                .update(offers)
                .set({
                  offerName: mappedOffer.offerName,
                  advertiserId: mappedOffer.advertiserId,
                  advertiserName: mappedOffer.advertiserName,
                  status: mappedOffer.status,
                  everflowAdvertiserId: mappedOffer.everflowAdvertiserId,
                  everflowData: mappedOffer.everflowData,
                  updatedBy: mappedOffer.updatedBy,
                  updatedAt: new Date(),
                })
                .where(eq(offers.id, existingOffer.id));

              updatedRecords++;
              syncedRecords++;
              processedCount++;
              if (options.onProgress && processedCount % 10 === 0) {
                await options.onProgress({ current: processedCount, total: totalRecords, stage: "Processing offers" });
              }
              logger.everflow.info(`Merged offer (Everflow data newer) - syncId: ${syncId}, offerId: ${mappedOffer.everflowOfferId}`);
            } else {
              skippedRecords++;
              processedCount++;
              if (options.onProgress && processedCount % 10 === 0) {
                await options.onProgress({ current: processedCount, total: totalRecords, stage: "Processing offers" });
              }
              logger.everflow.info(`Skipped merge (local data newer) - syncId: ${syncId}, offerId: ${mappedOffer.everflowOfferId}`);
            }
          }
        } else {
          await db.insert(offers).values({
            ...mappedOffer,
            createdBy: userId,
          });

          createdRecords++;
          syncedRecords++;
          processedCount++;
          if (options.onProgress && processedCount % 10 === 0) {
            await options.onProgress({ current: processedCount, total: totalRecords, stage: "Processing offers" });
          }
          logger.everflow.info(`Created new offer - syncId: ${syncId}, offerId: ${mappedOffer.everflowOfferId}`);
        }

        // Emit chunk event every 50 records
        if (processedCount > 0 && processedCount % 50 === 0 && options.onEvent) {
          await options.onEvent({
            type: "chunk_processed",
            message: `Processed ${processedCount} offers`,
            data: {
              chunkNumber: Math.ceil(processedCount / 50),
              processed: processedCount,
              total: totalRecords,
              offerIds: everflowOffers.slice(processedCount - 50, processedCount).map(o => o.network_offer_id)
            }
          });
        }
      } catch (error) {
        failedRecords++;
        processedCount++;
        if (options.onProgress && processedCount % 10 === 0) {
          await options.onProgress({ current: processedCount, total: totalRecords, stage: "Processing offers" });
        }
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        errors.push({
          offerId: everflowOffer.network_offer_id,
          error: errorMessage,
        });

        logger.everflow.error(`Failed to sync offer - syncId: ${syncId}, offerId: ${everflowOffer.network_offer_id}, error: ${errorMessage}`);
      }
    }

    await db
      .update(syncHistory)
      .set({
        status: "completed",
        totalRecords,
        syncedRecords,
        createdRecords,
        updatedRecords,
        skippedRecords,
        failedRecords,
        completedAt: new Date(),
      })
      .where(eq(syncHistory.id, syncId));

    logger.everflow.success(`Offers sync completed - syncId: ${syncId}, totalRecords: ${totalRecords}, syncedRecords: ${syncedRecords}, createdRecords: ${createdRecords}, updatedRecords: ${updatedRecords}, skippedRecords: ${skippedRecords}, failedRecords: ${failedRecords}`);

    return {
      syncId,
      status: "completed",
      totalRecords,
      syncedRecords,
      createdRecords,
      updatedRecords,
      skippedRecords,
      failedRecords,
      errors,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await db
      .update(syncHistory)
      .set({
        status: "failed",
        totalRecords,
        syncedRecords,
        createdRecords,
        updatedRecords,
        skippedRecords,
        failedRecords,
        errorMessage,
        completedAt: new Date(),
      })
      .where(eq(syncHistory.id, syncId));

    logger.everflow.error(`Offers sync failed - syncId: ${syncId}, error: ${errorMessage}`);

    return {
      syncId,
      status: "failed",
      totalRecords,
      syncedRecords,
      createdRecords,
      updatedRecords,
      skippedRecords,
      failedRecords,
      errors: [{ offerId: 0, error: errorMessage }],
    };
  }
}

interface EverflowAdvertiser {
  network_advertiser_id: number;
  name: string;
  advertiser_status?: string;
  contact_email?: string;
  [key: string]: unknown;
}

interface AdvertiserSyncResult {
  syncId: string;
  status: "completed" | "failed";
  totalRecords: number;
  syncedRecords: number;
  createdRecords: number;
  updatedRecords: number;
  skippedRecords: number;
  failedRecords: number;
  errors: Array<{ advertiserId: number; error: string }>;
}

/**
 * Maps Everflow advertiser status to local advertiser status
 */
function mapEverflowAdvertiserStatus(everflowStatus?: string): "active" | "inactive" {
  if (!everflowStatus) return "active";
  
  const statusMap: Record<string, "active" | "inactive"> = {
    active: "active",
    paused: "inactive",
    pending: "inactive",
    deleted: "inactive",
    inactive: "inactive",
  };

  return statusMap[everflowStatus.toLowerCase()] || "active";
}

/**
 * Maps Everflow advertiser to local advertiser format
 */
function mapEverflowAdvertiserToLocal(
  everflowAdvertiser: EverflowAdvertiser,
  _userId: string
): {
  name: string;
  contactEmail?: string;
  status: "active" | "inactive";
  everflowAdvertiserId: string;
  everflowData: Record<string, unknown>;
} {
  return {
    name: everflowAdvertiser.name || `Advertiser ${everflowAdvertiser.network_advertiser_id}`,
    contactEmail: everflowAdvertiser.contact_email || undefined,
    status: mapEverflowAdvertiserStatus(everflowAdvertiser.advertiser_status),
    everflowAdvertiserId: String(everflowAdvertiser.network_advertiser_id),
    everflowData: everflowAdvertiser as Record<string, unknown>,
  };
}

/**
 * Syncs advertisers from Everflow API to local database
 */
export async function syncAdvertisersFromEverflow(
  userId: string,
  options: SyncOptions = {}
): Promise<AdvertiserSyncResult> {
  const {
    conflictResolution = "update",
    filters = {},
    dryRun = false,
  } = options;

  const everflowService = getEverflowService();
  const syncId = crypto.randomUUID();

  await db
    .insert(syncHistory)
    .values({
      id: syncId,
      syncType: "advertisers",
      status: "in_progress",
      startedBy: userId,
      syncOptions: {
        conflictResolution,
        filters,
        limit: filters.limit,
      },
    });

  logger.everflow.info(`Starting advertisers sync - syncId: ${syncId}, userId: ${userId}, options: ${JSON.stringify(options)}`);

  const errors: Array<{ advertiserId: number; error: string }> = [];
  let totalRecords = 0;
  let syncedRecords = 0;
  let createdRecords = 0;
  let updatedRecords = 0;
  let skippedRecords = 0;
  let failedRecords = 0;

  try {
    const pageSize = filters.limit || 200;
    let allEverflowAdvertisers: EverflowAdvertiser[] = [];
    let totalPages = 1;
    let totalCount = 0;
    let actualPageSize = pageSize;

    const extractAdvertisersAndPaging = (response: unknown): { advertisers: EverflowAdvertiser[]; paging?: { page: number; page_size: number; total_count: number } } => {
      let advertisers: EverflowAdvertiser[] = [];
      let paging: { page: number; page_size: number; total_count: number } | undefined;

      if (Array.isArray(response)) {
        advertisers = response as EverflowAdvertiser[];
      } else if (response && typeof response === "object") {
        const resp = response as Record<string, unknown>;

        if ("paging" in resp && resp.paging && typeof resp.paging === "object") {
          const pagingObj = resp.paging as Record<string, unknown>;
          paging = {
            page: (pagingObj.page as number) || 1,
            page_size: (pagingObj.page_size as number) || pageSize,
            total_count: (pagingObj.total_count as number) || 0,
          };
        }

        if ("data" in resp && resp.data && typeof resp.data === "object") {
          const data = resp.data as Record<string, unknown>;
          if (Array.isArray(data.advertisers)) {
            advertisers = data.advertisers as EverflowAdvertiser[];
          } else if (Array.isArray(data.entries)) {
            advertisers = data.entries as EverflowAdvertiser[];
          } else if (Array.isArray(data)) {
            advertisers = data as EverflowAdvertiser[];
          }
        } else if (Array.isArray(resp.advertisers)) {
          advertisers = resp.advertisers as EverflowAdvertiser[];
        } else if (Array.isArray(resp.entries)) {
          advertisers = resp.entries as EverflowAdvertiser[];
        } else if (Array.isArray(resp.data)) {
          advertisers = resp.data as EverflowAdvertiser[];
        }
      }

      return { advertisers, paging };
    };

    const firstResponse = await everflowService.getAdvertisers({
      page: 1,
      limit: pageSize,
      status: filters.status,
    });

    logger.everflow.info(`Everflow advertisers API response received - syncId: ${syncId}, responseType: ${typeof firstResponse}, hasData: ${firstResponse && typeof firstResponse === "object" && "data" in firstResponse}, hasError: ${firstResponse && typeof firstResponse === "object" && "error" in firstResponse}, responseKeys: ${firstResponse && typeof firstResponse === "object" ? Object.keys(firstResponse).join(",") : ""}, rawResponse: ${JSON.stringify(firstResponse).substring(0, 1000)}`);

    if (firstResponse && typeof firstResponse === "object" && "error" in firstResponse) {
      const error = firstResponse.error as { code?: string; message?: string };
      throw new Error(error.message || `Everflow API error: ${error.code || "unknown"}`);
    }

    const responseData = firstResponse && typeof firstResponse === "object" && "data" in firstResponse
      ? (firstResponse as { data: unknown }).data
      : firstResponse;

    const { advertisers: firstPageAdvertisers, paging: firstPaging } = extractAdvertisersAndPaging(responseData);

    logger.everflow.info(`Extracted advertisers from response - syncId: ${syncId}, advertisersCount: ${firstPageAdvertisers.length}, hasPaging: ${!!firstPaging}, pagingInfo: ${JSON.stringify(firstPaging)}`);

    if (firstPaging) {
      totalCount = firstPaging.total_count;
      actualPageSize = firstPaging.page_size;
      totalPages = Math.ceil(totalCount / actualPageSize);
      logger.everflow.info(`Extracted pagination info from Everflow response - syncId: ${syncId}, totalCount: ${firstPaging.total_count}, pageSize: ${firstPaging.page_size}, totalPages: ${totalPages}, currentPage: ${firstPaging.page}`);
    } else {
      totalCount = firstPageAdvertisers.length;
      totalPages = firstPageAdvertisers.length === pageSize ? 2 : 1;
      logger.everflow.warn(`No paging object in Everflow response, using fallback - syncId: ${syncId}, advertisersReceived: ${firstPageAdvertisers.length}, pageSize: ${pageSize}, assumedTotalPages: ${totalPages}`);
    }

    allEverflowAdvertisers = [...firstPageAdvertisers];
    logger.everflow.info(`Fetched first page from Everflow - syncId: ${syncId}, page: 1, advertisersInPage: ${firstPageAdvertisers.length}, totalCount: ${totalCount}, totalPages: ${totalPages}, actualPageSize: ${actualPageSize}`);

    if (totalPages > 1) {
      for (let currentPage = 2; currentPage <= totalPages; currentPage++) {
        if (allEverflowAdvertisers.length >= totalCount && totalCount > 0) {
          logger.everflow.warn(`Stopping pagination - already fetched all unique advertisers - syncId: ${syncId}, currentPage: ${currentPage}, totalPages: ${totalPages}, fetchedSoFar: ${allEverflowAdvertisers.length}, totalCount: ${totalCount}`);
          break;
        }

        logger.everflow.info(`Fetching page from Everflow - syncId: ${syncId}, page: ${currentPage}, totalPages: ${totalPages}, fetchedSoFar: ${allEverflowAdvertisers.length}, totalCount: ${totalCount}`);

        const pageResponse = await everflowService.getAdvertisers({
          page: currentPage,
          limit: actualPageSize,
          status: filters.status,
        });

        if (pageResponse && typeof pageResponse === "object" && "error" in pageResponse) {
          const error = pageResponse.error as { code?: string; message?: string };
          throw new Error(error.message || `Everflow API error: ${error.code || "unknown"}`);
        }

        const pageResponseData = pageResponse && typeof pageResponse === "object" && "data" in pageResponse
          ? (pageResponse as { data: unknown }).data
          : pageResponse;

        const { advertisers: pageAdvertisers } = extractAdvertisersAndPaging(pageResponseData);

        allEverflowAdvertisers = [...allEverflowAdvertisers, ...pageAdvertisers];
        logger.everflow.info(`Fetched page from Everflow - syncId: ${syncId}, page: ${currentPage}, advertisersInPage: ${pageAdvertisers.length}, totalFetched: ${allEverflowAdvertisers.length}, totalCount: ${totalCount}`);

        if (pageAdvertisers.length < actualPageSize) {
          logger.everflow.info(`Received fewer advertisers than page size, likely last page - syncId: ${syncId}, page: ${currentPage}, advertisersReceived: ${pageAdvertisers.length}, pageSize: ${actualPageSize}`);
        }

        if (pageAdvertisers.length === 0) {
          logger.everflow.warn(`Received 0 advertisers, stopping pagination - syncId: ${syncId}, page: ${currentPage}`);
          break;
        }
      }
    }

    const uniqueAdvertisersMap = new Map<number, EverflowAdvertiser>();
    for (const advertiser of allEverflowAdvertisers) {
      const advertiserId = advertiser.network_advertiser_id;
      if (!uniqueAdvertisersMap.has(advertiserId)) {
        uniqueAdvertisersMap.set(advertiserId, advertiser);
      } else {
        logger.everflow.warn(`Duplicate advertiser detected, keeping first occurrence - syncId: ${syncId}, advertiserId: ${advertiserId}, advertiserName: ${advertiser.name}`);
      }
    }

    const everflowAdvertisers = Array.from(uniqueAdvertisersMap.values());
    totalRecords = everflowAdvertisers.length;

    logger.everflow.info(`Fetched and deduplicated advertisers from Everflow - syncId: ${syncId}, totalFetched: ${allEverflowAdvertisers.length}, totalUnique: ${totalRecords}, duplicatesRemoved: ${allEverflowAdvertisers.length - totalRecords}`);

    if (options.onProgress && totalRecords > 0) {
      await options.onProgress({ current: 0, total: totalRecords, stage: `Fetched ${totalRecords} advertisers, starting sync` });
    } else if (options.onProgress) {
      await options.onProgress({ current: 0, total: 0, stage: "No advertisers found" });
    }

    if (dryRun) {
      logger.everflow.info(`Dry run mode - skipping database operations - syncId: ${syncId}, totalRecords: ${totalRecords}`);

      await db
        .update(syncHistory)
        .set({
          status: "completed",
          totalRecords,
          syncedRecords: 0,
          completedAt: new Date(),
        })
        .where(eq(syncHistory.id, syncId));

      return {
        syncId,
        status: "completed",
        totalRecords,
        syncedRecords: 0,
        createdRecords: 0,
        updatedRecords: 0,
        skippedRecords: 0,
        failedRecords: 0,
        errors: [],
      };
    }

    let processedCount = 0;
    for (const everflowAdvertiser of everflowAdvertisers) {
      try {
        const mappedAdvertiser = mapEverflowAdvertiserToLocal(everflowAdvertiser, userId);

        const [existingAdvertiserByEverflowId] = await db
          .select()
          .from(advertisers)
          .where(eq(advertisers.everflowAdvertiserId, mappedAdvertiser.everflowAdvertiserId))
          .limit(1);

        const [existingAdvertiserById] = await db
          .select()
          .from(advertisers)
          .where(eq(advertisers.id, mappedAdvertiser.everflowAdvertiserId))
          .limit(1);

        const existingAdvertiser = existingAdvertiserByEverflowId || existingAdvertiserById;

        if (existingAdvertiser) {
          if (conflictResolution === "skip") {
            skippedRecords++;
            processedCount++;
            if (options.onProgress && (processedCount % 5 === 0 || processedCount === totalRecords)) {
              await options.onProgress({ current: processedCount, total: totalRecords, stage: "Processing advertisers" });
            }
            logger.everflow.info(`Skipping existing advertiser - syncId: ${syncId}, advertiserId: ${mappedAdvertiser.everflowAdvertiserId}`);
            continue;
          }

          if (conflictResolution === "update") {
            const updateData: any = {
              name: mappedAdvertiser.name,
              contactEmail: mappedAdvertiser.contactEmail,
              status: mappedAdvertiser.status,
              everflowData: mappedAdvertiser.everflowData,
              updatedAt: new Date(),
            };

            if (!existingAdvertiser.everflowAdvertiserId) {
              updateData.everflowAdvertiserId = mappedAdvertiser.everflowAdvertiserId;
            }

            await db
              .update(advertisers)
              .set(updateData)
              .where(eq(advertisers.id, existingAdvertiser.id));

            updatedRecords++;
            syncedRecords++;
            processedCount++;
            if (options.onProgress && (processedCount % 5 === 0 || processedCount === totalRecords)) {
              await options.onProgress({ current: processedCount, total: totalRecords, stage: "Processing advertisers" });
            }
            logger.everflow.info(`Updated existing advertiser - syncId: ${syncId}, advertiserId: ${mappedAdvertiser.everflowAdvertiserId}`);
          } else if (conflictResolution === "merge") {
            const everflowUpdated = everflowAdvertiser.time_saved
              ? new Date((everflowAdvertiser.time_saved as number) * 1000)
              : null;
            const localUpdated = existingAdvertiser.updatedAt;

            if (!everflowUpdated || everflowUpdated > localUpdated) {
              const updateData: any = {
                name: mappedAdvertiser.name,
                contactEmail: mappedAdvertiser.contactEmail,
                status: mappedAdvertiser.status,
                everflowData: mappedAdvertiser.everflowData,
                updatedAt: new Date(),
              };

              if (!existingAdvertiser.everflowAdvertiserId) {
                updateData.everflowAdvertiserId = mappedAdvertiser.everflowAdvertiserId;
              }

              await db
                .update(advertisers)
                .set(updateData)
                .where(eq(advertisers.id, existingAdvertiser.id));

              updatedRecords++;
              syncedRecords++;
              processedCount++;
              if (options.onProgress && processedCount % 10 === 0) {
                await options.onProgress({ current: processedCount, total: totalRecords, stage: "Processing advertisers" });
              }
              logger.everflow.info(`Merged advertiser (Everflow data newer) - syncId: ${syncId}, advertiserId: ${mappedAdvertiser.everflowAdvertiserId}`);
            } else {
              skippedRecords++;
              processedCount++;
              if (options.onProgress && processedCount % 10 === 0) {
                await options.onProgress({ current: processedCount, total: totalRecords, stage: "Processing advertisers" });
              }
              logger.everflow.info(`Skipped merge (local data newer) - syncId: ${syncId}, advertiserId: ${mappedAdvertiser.everflowAdvertiserId}`);
            }
          }
        } else {
          const insertValues: any = {
            id: mappedAdvertiser.everflowAdvertiserId,
            name: mappedAdvertiser.name,
            contactEmail: mappedAdvertiser.contactEmail,
            status: mappedAdvertiser.status,
            everflowAdvertiserId: mappedAdvertiser.everflowAdvertiserId,
            everflowData: mappedAdvertiser.everflowData,
          };

          try {
            await db.insert(advertisers).values(insertValues);

            createdRecords++;
            syncedRecords++;
            processedCount++;
            if (options.onProgress && processedCount % 10 === 0) {
              await options.onProgress({ current: processedCount, total: totalRecords, stage: "Processing advertisers" });
            }
            logger.everflow.info(`Created new advertiser - syncId: ${syncId}, advertiserId: ${mappedAdvertiser.everflowAdvertiserId}`);
          } catch (insertError: any) {
            if (insertError?.code === "23505" || insertError?.message?.includes("duplicate key") || insertError?.message?.includes("unique constraint")) {
              const [conflictingAdvertiser] = await db
                .select()
                .from(advertisers)
                .where(eq(advertisers.id, mappedAdvertiser.everflowAdvertiserId))
                .limit(1);

              if (conflictingAdvertiser) {
                await db
                  .update(advertisers)
                  .set({
                    name: mappedAdvertiser.name,
                    contactEmail: mappedAdvertiser.contactEmail,
                    status: mappedAdvertiser.status,
                    everflowAdvertiserId: mappedAdvertiser.everflowAdvertiserId,
                    everflowData: mappedAdvertiser.everflowData,
                    updatedAt: new Date(),
                  })
                  .where(eq(advertisers.id, conflictingAdvertiser.id));

                updatedRecords++;
                syncedRecords++;
                processedCount++;
                if (options.onProgress && processedCount % 10 === 0) {
                  await options.onProgress({ current: processedCount, total: totalRecords, stage: "Processing advertisers" });
                }
                logger.everflow.info(`Updated existing advertiser (ID conflict resolved) - syncId: ${syncId}, advertiserId: ${mappedAdvertiser.everflowAdvertiserId}`);
              } else {
                throw insertError;
              }
            } else {
              throw insertError;
            }
          }
        }

        if (processedCount > 0 && processedCount % 50 === 0 && options.onEvent) {
          await options.onEvent({
            type: "chunk_processed",
            message: `Processed ${processedCount} advertisers`,
            data: {
              chunkNumber: Math.ceil(processedCount / 50),
              processed: processedCount,
              total: totalRecords,
              advertiserIds: everflowAdvertisers.slice(processedCount - 50, processedCount).map(a => a.network_advertiser_id)
            }
          });
        }
      } catch (error) {
        failedRecords++;
        processedCount++;
        if (options.onProgress && processedCount % 10 === 0) {
          await options.onProgress({ current: processedCount, total: totalRecords, stage: "Processing advertisers" });
        }
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        errors.push({
          advertiserId: everflowAdvertiser.network_advertiser_id,
          error: errorMessage,
        });

        logger.everflow.error(`Failed to sync advertiser - syncId: ${syncId}, advertiserId: ${everflowAdvertiser.network_advertiser_id}, error: ${errorMessage}`);
      }
    }

    await db
      .update(syncHistory)
      .set({
        status: "completed",
        totalRecords,
        syncedRecords,
        createdRecords,
        updatedRecords,
        skippedRecords,
        failedRecords,
        completedAt: new Date(),
      })
      .where(eq(syncHistory.id, syncId));

    logger.everflow.success(`Advertisers sync completed - syncId: ${syncId}, totalRecords: ${totalRecords}, syncedRecords: ${syncedRecords}, createdRecords: ${createdRecords}, updatedRecords: ${updatedRecords}, skippedRecords: ${skippedRecords}, failedRecords: ${failedRecords}`);

    return {
      syncId,
      status: "completed",
      totalRecords,
      syncedRecords,
      createdRecords,
      updatedRecords,
      skippedRecords,
      failedRecords,
      errors,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await db
      .update(syncHistory)
      .set({
        status: "failed",
        totalRecords,
        syncedRecords,
        createdRecords,
        updatedRecords,
        skippedRecords,
        failedRecords,
        errorMessage,
        completedAt: new Date(),
      })
      .where(eq(syncHistory.id, syncId));

    logger.everflow.error(`Advertisers sync failed - syncId: ${syncId}, error: ${errorMessage}`);

    return {
      syncId,
      status: "failed",
      totalRecords,
      syncedRecords,
      createdRecords,
      updatedRecords,
      skippedRecords,
      failedRecords,
      errors: [{ advertiserId: 0, error: errorMessage }],
    };
  }
}

/**
 * Get sync history
 */
export async function getSyncHistory(
  syncType?: string,
  limit = 50
): Promise<typeof syncHistory.$inferSelect[]> {
  if (syncType) {
    return db
      .select()
      .from(syncHistory)
      .where(eq(syncHistory.syncType, syncType))
      .orderBy(desc(syncHistory.startedAt))
      .limit(limit);
  }

  return db
    .select()
    .from(syncHistory)
    .orderBy(desc(syncHistory.startedAt))
    .limit(limit);
}

