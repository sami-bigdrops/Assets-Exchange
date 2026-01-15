/**
 * Offer Service Layer
 *
 * Note: Most CRUD operations have been implemented. See offers.client.ts for client-side API calls.
 *
 * Remaining Backend API Endpoints:
 * - PATCH /api/admin/offers/:id/status (activate/deactivate)
 * - PATCH /api/admin/offers/:id/visibility (update visibility)
 * - POST /api/admin/offers/bulk-update (bulk update multiple offers)
 */

import "server-only";
// Note: RPC client removed to avoid pulling in server-only dependencies during build
// This service should use REST API endpoints instead (see offers.client.ts for reference)
import type { Offer } from "../types/offer.types";

/**
 * DEPRECATED: Use offers.client.ts instead
 * GET /api/admin/offers is implemented - use fetchOffers from offers.client.ts
 */
export async function getAllOffers(): Promise<Offer[]> {
  throw new Error("getAllOffers is deprecated. Use fetchOffers from offers.client.ts instead");
}

/**
 * DEPRECATED: Use offers.client.ts instead
 * GET /api/admin/offers/:id is implemented - use getOffer from offers.client.ts
 */
export async function getOfferById(_id: string): Promise<Offer | null> {
  throw new Error("getOfferById is deprecated. Use getOffer from offers.client.ts instead");
}

/**
 * DEPRECATED: Use offers.client.ts instead
 * POST /api/admin/offers is implemented - use createOffer from offers.client.ts
 */
export async function createOffer(
  _offer: Omit<Offer, "id">,
  _offerId?: string
): Promise<Offer> {
  throw new Error("createOffer is deprecated. Use createOffer from offers.client.ts instead");
}

/**
 * DEPRECATED: Use offers.client.ts instead
 * PUT /api/admin/offers/:id is implemented - use updateOffer from offers.client.ts
 */
export async function updateOffer(
  _id: string,
  _updates: Partial<Offer>
): Promise<Offer> {
  throw new Error("updateOffer is deprecated. Use updateOffer from offers.client.ts instead");
}

/**
 * DEPRECATED: Use offers.client.ts instead
 * DELETE /api/admin/offers/:id is implemented - use deleteOffer from offers.client.ts
 */
export async function deleteOffer(_id: string): Promise<void> {
  throw new Error("deleteOffer is deprecated. Use deleteOffer from offers.client.ts instead");
}

/**
 * TODO: BACKEND - Implement updateOfferStatus API
 *
 * Replace with: PATCH /api/admin/offers/:id/status
 *
 * Requirements:
 * 1. Update only the status field
 *    - More efficient than full update
 *    - Atomic operation
 *
 * 2. Request Body:
 *    {
 *      status: "Active" | "Inactive"
 *    }
 *
 * 3. Response:
 *    - Return updated offer object
 *
 * 4. Error Handling:
 *    - 404: Offer not found
 *    - 400: Invalid status value
 *    - 401: Unauthorized
 *    - 403: Forbidden
 *    - 500: Server error
 *
 * 5. Business Rules:
 *    - API-created offers should always be "Active"
 *    - Manually-created offers can be "Active" or "Inactive"
 */
// DEPRECATED: Use offers.client.ts instead
export async function updateOfferStatus(
  _id: string,
  _status: "Active" | "Inactive"
): Promise<Offer> {
  throw new Error("updateOfferStatus is deprecated. Use updateOffer from offers.client.ts instead");
}

/**
 * TODO: BACKEND - Implement updateOfferVisibility API
 *
 * Replace with: PATCH /api/admin/offers/:id/visibility
 *
 * Requirements:
 * 1. Update only the visibility field
 *    - Optimized for frequent updates
 *    - Used by dropdown in offers table
 *
 * 2. Request Body:
 *    {
 *      visibility: "Public" | "Internal" | "Hidden"
 *    }
 *
 * 3. Response:
 *    - Return updated offer object
 *    - Include updatedAt timestamp
 *
 * 4. Error Handling:
 *    - 404: Offer not found
 *    - 400: Invalid visibility value
 *    - 401: Unauthorized
 *    - 403: Forbidden
 *    - 500: Server error
 *
 * 5. Performance:
 *    - This is called frequently from UI dropdown
 *    - Consider optimistic updates on frontend
 *    - Use debouncing if user changes rapidly
 *
 * 6. Audit Trail:
 *    - Log visibility changes
 *    - Track who changed and when
 */
// DEPRECATED: Use offers.client.ts instead
export async function updateOfferVisibility(
  _id: string,
  _visibility: "Public" | "Internal" | "Hidden"
): Promise<Offer> {
  throw new Error("updateOfferVisibility is deprecated. Use updateOffer from offers.client.ts instead");
}

/**
 * TODO: BACKEND - Implement bulkUpdateOffers API
 *
 * Replace with: POST /api/admin/offers/bulk-update
 *
 * Requirements:
 * 1. Update multiple offers with the same changes
 *    - Accept array of offer IDs
 *    - Apply same updates to all selected offers
 *    - Return partial success if some offers fail
 *
 * 2. Request Body:
 *    {
 *      offerIds: string[],                    // Array of offer IDs to update
 *      updates: {
 *        visibility?: "Public" | "Internal" | "Hidden",
 *        brandGuidelines?: {
 *          type: "url" | "file" | "text",
 *          url?: string,                       // If type is "url"
 *          file?: File,                        // If type is "file" - use FormData
 *          text?: string,                      // If type is "text"
 *          notes?: string                      // Brand guidelines notes
 *        }
 *      }
 *    }
 *
 * 3. For file uploads:
 *    - Use multipart/form-data
 *    - Validate file size (max 10MB)
 *    - Validate file type (only .doc, .docx, .pdf)
 *    - Store file in secure storage
 *    - Apply same file to all offers OR create separate file per offer
 *
 * 4. Response:
 *    {
 *      success: boolean,
 *      updated: number,                        // Number of offers successfully updated
 *      failed: number,                         // Number of offers that failed
 *      results: {
 *        successful: string[],                 // Array of offer IDs that were updated
 *        failed: {                            // Array of offers that failed
 *          offerId: string,
 *          error: string,
 *          reason: string
 *        }[]
 *      },
 *      message: string
 *    }
 *
 * 5. Error Handling:
 *    - 400: Validation errors (empty offerIds, invalid values)
 *    - 401: Unauthorized
 *    - 403: Forbidden
 *    - 404: One or more offers not found
 *    - 413: File too large
 *    - 500: Server error
 *
 * 6. Performance:
 *    - For large batches, consider background job processing
 *    - Provide progress updates
 *    - Allow cancellation
 *
 * 7. Business Rules:
 *    - All offer IDs must exist
 *    - Validate all updates before applying
 *    - Process in transaction if possible (all or nothing)
 *    - Or allow partial success with detailed results
 *
 * Example Implementation:
 * ```typescript
 * export async function bulkUpdateOffers(
 *   offerIds: string[],
 *   updates: {
 *     visibility?: "Public" | "Internal" | "Hidden",
 *     brandGuidelines?: {
 *       type: "url" | "file" | "text",
 *       url?: string,
 *       file?: File,
 *       text?: string,
 *       notes?: string
 *     }
 *   }
 * ): Promise<{
 *   success: boolean,
 *   updated: number,
 *   failed: number,
 *   results: {
 *     successful: string[],
 *     failed: Array<{ offerId: string, error: string, reason: string }>
 *   },
 *   message: string
 * }> {
 *   const formData = new FormData();
 *   formData.append('offerIds', JSON.stringify(offerIds));
 *
 *   if (updates.visibility) {
 *     formData.append('visibility', updates.visibility);
 *   }
 *
 *   if (updates.brandGuidelines) {
 *     formData.append('brandGuidelinesType', updates.brandGuidelines.type);
 *
 *     if (updates.brandGuidelines.type === 'file' && updates.brandGuidelines.file) {
 *       formData.append('brandGuidelinesFile', updates.brandGuidelines.file);
 *     } else if (updates.brandGuidelines.type === 'url' && updates.brandGuidelines.url) {
 *       formData.append('brandGuidelinesUrl', updates.brandGuidelines.url);
 *     } else if (updates.brandGuidelines.type === 'text' && updates.brandGuidelines.text) {
 *       formData.append('brandGuidelinesText', updates.brandGuidelines.text);
 *     }
 *
 *     if (updates.brandGuidelines.notes) {
 *       formData.append('brandGuidelinesNotes', updates.brandGuidelines.notes);
 *     }
 *   }
 *
 *   const response = await fetch('/api/admin/offers/bulk-update', {
 *     method: 'POST',
 *     headers: {
 *       'Authorization': `Bearer ${getAuthToken()}`
 *     },
 *     body: formData
 *   });
 *
 *   if (!response.ok) {
 *     const error = await response.json();
 *     throw new Error(error.message || 'Failed to update offers');
 *   }
 *
 *   return await response.json();
 * }
 * ```
 */
export async function bulkUpdateOffers(
  offerIds: string[],
  _updates: {
    visibility?: "Public" | "Internal" | "Hidden";
    brandGuidelines?: {
      type: "url" | "file" | "text";
      url?: string;
      file?: File;
      text?: string;
      notes?: string;
    };
  }
): Promise<{
  success: boolean;
  updated: number;
  failed: number;
  results: {
    successful: string[];
    failed: Array<{ offerId: string; error: string; reason: string }>;
  };
  message: string;
}> {
  // TODO: BACKEND - Implement POST /api/admin/offers/bulk-update endpoint
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        updated: offerIds.length,
        failed: 0,
        results: {
          successful: offerIds,
          failed: [],
        },
        message: `Successfully updated ${offerIds.length} offer(s)`,
      });
    }, 1000);
  });
}
