"use client";

import { useCallback, useState } from "react";

import { createAdvertiser } from "@/features/admin/services/advertisers.client";
import type { Advertiser } from "@/features/admin/types/advertiser.types";

export interface NewAdvertiserFormData {
  companyName: string;
  advertiserId: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export function useNewAdvertiserManuallyViewModel() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitAdvertiser = useCallback(
    async (formData: NewAdvertiserFormData): Promise<Advertiser | null> => {
      try {
        setIsSubmitting(true);
        setError(null);

        const createdAdvertiser = await createAdvertiser({
          id: formData.advertiserId.trim(),
          name: formData.companyName.trim(),
          contactEmail: formData.email.trim(),
        });

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
    isSubmitting,
    error,
    submitAdvertiser,
    reset,
  };
}
