"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchOffers, deleteOffer, updateOffer } from "@/features/admin/services/offers.client";
import type { Offer } from "@/features/admin/types/offer.types";

export function useOffersViewModel() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (search?: string, status?: "Active" | "Inactive") => {
    try {
      setIsLoading(true);
      const data = await fetchOffers({ search, status });
      setOffers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch offers");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load(); 
  }, [load]);

  return {
    offers,
    isLoading,
    error,
    refresh: load,
    deleteOffer,
    updateOffer,
  };
}
