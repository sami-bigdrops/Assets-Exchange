/**
 * useManageRequestsViewModel - Fetches creative requests for /requests page
 *
 * UNIFIED MODEL:
 * Fetches all creative requests from the system.
 * The ManageRequestsPage component filters these by tabs (status + approvalStage).
 *
 * Data source: Same creative_requests table that contains the complete workflow
 */

"use client";

import { useEffect, useState } from "react";

import { getAllRequests } from "../services/request.service";
import type { Request } from "../types/admin.types";

export function useManageRequestsViewModel() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const allRequests = await getAllRequests();
        setRequests(allRequests);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load requests"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return {
    requests,
    isLoading,
    error,
  };
}
