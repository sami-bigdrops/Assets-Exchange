"use client";

import { useEffect, useState } from "react";

import { getAllOffers } from "../services/offers.service";
import type { Offer } from "../types/admin.types";

export function useOffersViewModel() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        setIsLoading(true);
        const data = await getAllOffers();
        setOffers(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch offers");
        setOffers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOffers();
  }, []);

  return {
    offers,
    isLoading,
    error,
  };
}
