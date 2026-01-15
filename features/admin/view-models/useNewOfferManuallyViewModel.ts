"use client";

import { useCallback, useState } from "react";

import { createOffer } from "@/features/admin/services/offers.client";
import type { Offer } from "@/features/admin/types/offer.types";

export interface NewOfferFormData {
  offerId: string;
  offerName: string;
  advertiserId: string;
  advertiserName: string;
  advertiserDisplayId?: string;
  status: "Active" | "Inactive";
  visibility: "Public" | "Internal" | "Hidden";
  brandGuidelinesType: "url" | "upload" | "text";
  brandGuidelinesUrl?: string;
  brandGuidelinesFile?: File | null;
  brandGuidelinesText?: string;
  brandGuidelinesNotes?: string;
}

export function useNewOfferManuallyViewModel() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitOffer = useCallback(
    async (formData: NewOfferFormData): Promise<Offer | null> => {
      try {
        setIsSubmitting(true);
        setError(null);

        const createdOffer = await createOffer({
          id: formData.offerId.trim(),
          name: formData.offerName.trim(),
          advertiserId: formData.advertiserId,
          status: formData.status,
          visibility: formData.visibility,
        });

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
    isSubmitting,
    error,
    submitOffer,
    reset,
  };
}
