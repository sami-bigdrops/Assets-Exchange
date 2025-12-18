"use client";

import { useEffect, useState } from "react";

import { getAllAdvertiserResponses } from "../services/request.service";
import type { Request } from "../types/admin.types";

export function useManageResponsesViewModel() {
  const [responses, setResponses] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResponses = async () => {
      try {
        setIsLoading(true);
        const data = await getAllAdvertiserResponses();
        setResponses(data);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch responses"
        );
        setResponses([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResponses();
  }, []);

  return {
    responses,
    isLoading,
    error,
  };
}
