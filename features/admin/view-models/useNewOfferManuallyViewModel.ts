"use client";

import { useCallback, useState } from "react";

import { createOffer } from "../services/offers.service";
import type { Offer } from "../types/admin.types";

export interface NewOfferFormData {
  offerId: string;
  offerName: string;
  advertiserId: string;
  advertiserName: string;
  status: "Active" | "Inactive";
  visibility: "Public" | "Internal" | "Hidden";
  brandGuidelinesType: "url" | "upload" | "text";
  brandGuidelinesUrl?: string;
  brandGuidelinesFile?: File | null;
  brandGuidelinesText?: string;
}

export function useNewOfferManuallyViewModel() {
  const [isLoading, _setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * TODO: BACKEND - Implement Offer Creation with Brand Guidelines
   *
   * Current implementation only sends basic offer data.
   * Need to handle brand guidelines upload and all form fields.
   *
   * Endpoint: POST /api/admin/offers
   *
   * Request Body:
   * {
   *   offerId?: string,              // Optional, if provided use this ID
   *   offerName: string,               // Required
   *   advertiserId: string,           // Required
   *   advertiserName: string,          // Required
   *   status: "Active" | "Inactive",   // Required
   *   visibility: "Public" | "Internal" | "Hidden", // Required
   *   brandGuidelines?: {              // Optional
   *     type: "url" | "file" | "text",
   *     url?: string,                  // If type is "url"
   *     file?: File,                   // If type is "file" - use FormData
   *     text?: string                   // If type is "text"
   *   }
   * }
   *
   * For file uploads:
   * - Use multipart/form-data
   * - Validate file size (max 10MB)
   * - Validate file type (only .doc, .docx, .pdf)
   * - Store file in secure storage (S3, Azure Blob, etc.)
   * - Return file URL or file ID for reference
   *
   * Response:
   * {
   *   id: string,
   *   offerName: string,
   *   advName: string,
   *   createdMethod: "Manually",
   *   status: "Active" | "Inactive",
   *   visibility: "Public" | "Internal" | "Hidden",
   *   createdAt: string,               // ISO timestamp
   *   updatedAt: string,                // ISO timestamp
   *   brandGuidelines?: {
   *     type: "url" | "file" | "text",
   *     url?: string,
   *     fileUrl?: string,              // If type is "file"
   *     fileName?: string,             // If type is "file"
   *     text?: string                   // If type is "text"
   *   }
   * }
   *
   * Error Handling:
   * - 400: Validation errors
   *   - Missing required fields
   *   - Invalid offerId format
   *   - Invalid file type/size
   *   - Invalid URL format for brand guidelines
   *   - Return field-specific errors: { field: string, message: string }[]
   *
   * - 401: Unauthorized - redirect to login
   * - 403: Forbidden - show permission denied
   * - 409: Conflict - offerId already exists (if provided)
   * - 413: File too large - show specific error
   * - 500: Server error - show error with retry option
   *
   * Success:
   * - Return created offer object
   * - Show success notification
   * - Refresh offers list
   * - Close modal
   *
   * Implementation Notes:
   * - If offerId is provided, check if it already exists (409 conflict)
   * - If no offerId provided, backend should generate unique ID
   * - For file uploads, handle progress if file is large
   * - Store brand guidelines metadata separately from offer
   * - Link brand guidelines to offer via offerId
   */
  const submitOffer = useCallback(
    async (formData: NewOfferFormData): Promise<Offer | null> => {
      try {
        setIsSubmitting(true);
        setError(null);

        // TODO: Handle brand guidelines upload
        // TODO: Create FormData if file upload is needed
        // TODO: Send all form fields including brand guidelines

        const newOffer: Omit<Offer, "id"> = {
          offerName: formData.offerName.trim(),
          advName: formData.advertiserName.trim(),
          createdMethod: "Manually",
          status: formData.status,
          visibility: formData.visibility,
        };

        const createdOffer = await createOffer(
          newOffer,
          formData.offerId.trim() || undefined
        );
        return createdOffer;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create offer";
        setError(errorMessage);
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setError(null);
    setIsSubmitting(false);
  }, []);

  return {
    isLoading,
    isSubmitting,
    error,
    submitOffer,
    reset,
  };
}
