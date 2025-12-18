"use client";

import { useEffect, useState } from "react";

import { getAllAdvertisers } from "../services/advertiser.service";
import type { Advertiser } from "../types/admin.types";

export function useAdvertiserViewModel() {
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdvertisers = async () => {
      try {
        setIsLoading(true);
        const data = await getAllAdvertisers();
        setAdvertisers(data);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch advertisers"
        );
        setAdvertisers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdvertisers();
  }, []);

  return {
    advertisers,
    isLoading,
    error,
  };
}
