"use client";

import { useEffect, useState } from "react";

import { getAllPublishers } from "../services/publisher.service";
import type { Publisher } from "../types/admin.types";

export function usePublisherViewModel() {
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublishers = async () => {
      try {
        setIsLoading(true);
        const data = await getAllPublishers();
        setPublishers(data);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch publishers"
        );
        setPublishers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPublishers();
  }, []);

  return {
    publishers,
    isLoading,
    error,
  };
}
