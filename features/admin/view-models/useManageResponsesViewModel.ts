/**
 * useManageResponsesViewModel - Fetches creative requests for /response page
 *
 * UNIFIED MODEL:
 * Fetches creative requests that are in advertiser stage or completed.
 * These are the SAME creative requests, just filtered differently.
 *
 * IMPORTANT: These are NOT separate "response" entities!
 * They are creative requests that admin approved and forwarded to advertiser.
 *
 * Data source: Same creative_requests table, filtered for approvalStage IN ('advertiser', 'completed')
 */

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
