"use client";

import { useCallback, useState } from "react";

import { createAdvertiser } from "../services/advertiser.service";
import type { Advertiser } from "../types/admin.types";

export interface NewAdvertiserFormData {
  companyName: string;
  advertiserId: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export function useNewAdvertiserManuallyViewModel() {
  const [isLoading, _setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * TODO: BACKEND - Implement Advertiser Creation
   *
   * Endpoint: POST /api/admin/advertisers
   *
   * Request Body:
   * {
   *   advertiserId: string,        // Auto-generated incrementally: M0001, M0002, etc.
   *   companyName: string,          // Required
   *   firstName: string,            // Required
   *   lastName: string,             // Required
   *   email: string,                // Required, must be valid email format
   *   password: string,             // Required, min 8 characters
   *   status: "Active" | "Inactive", // Default: "Active"
   *   createdMethod: "Manually"     // Always "Manually" for this flow
   * }
   *
   * Response:
   * {
   *   id: string,                   // Advertiser ID (M0001, M0002, etc.)
   *   advertiserName: string,        // Company Name
   *   advPlatform: string,          // Default or empty
   *   createdMethod: "Manually",
   *   status: "Active" | "Inactive",
   *   firstName: string,
   *   lastName: string,
   *   email: string,
   *   createdAt: string,            // ISO timestamp
   *   updatedAt: string              // ISO timestamp
   * }
   *
   * Error Handling:
   * - 400: Validation errors
   *   - Missing required fields
   *   - Invalid email format
   *   - Password too short
   *   - Advertiser ID already exists
   *   - Return field-specific errors: { field: string, message: string }[]
   *
   * - 401: Unauthorized - redirect to login
   * - 403: Forbidden - show permission denied
   * - 409: Conflict - advertiserId or email already exists
   * - 500: Server error - show error with retry option
   *
   * Success:
   * - Return created advertiser object
   * - Show success notification
   * - Refresh advertisers list
   * - Close modal
   *
   * Implementation Notes:
   * - Advertiser ID is auto-generated incrementally: M001, M002, M003, etc.
   * - Backend should validate uniqueness of advertiserId and email
   * - Password should be hashed before storing
   * - Send welcome email to the advertiser with credentials
   */
  const submitAdvertiser = useCallback(
    async (formData: NewAdvertiserFormData): Promise<Advertiser | null> => {
      try {
        setIsSubmitting(true);
        setError(null);

        const newAdvertiser: Omit<Advertiser, "id"> = {
          advertiserName: formData.companyName.trim(),
          advPlatform: "Everflow",
          createdMethod: "Manually",
          status: "Active",
        };

        const createdAdvertiser = await createAdvertiser(
          newAdvertiser,
          formData.advertiserId.trim()
        );
        return createdAdvertiser;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create advertiser";
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
    submitAdvertiser,
    reset,
  };
}
