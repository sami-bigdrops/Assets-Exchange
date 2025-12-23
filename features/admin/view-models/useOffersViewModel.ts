"use client";

/**
 * TODO: BACKEND - Enhance Offers View Model
 *
 * Current implementation fetches offers once on mount.
 * Consider adding:
 * - Refresh function to manually reload offers
 * - Real-time updates via WebSocket/SSE
 * - Optimistic updates for better UX
 * - Pagination support
 * - Filtering and sorting on backend
 */

import { useEffect, useState } from "react";

import { getAllOffers } from "../services/offers.service";
import type { Offer } from "../types/admin.types";

export function useOffersViewModel() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * TODO: BACKEND - Add refresh function
   *
   * Expose a refresh function that can be called after:
   * - Creating a new offer
   * - Updating an offer
   * - Bulk operations
   * - Pulling from API
   *
   * Implementation:
   * const refresh = useCallback(async () => {
   *   try {
   *     setIsLoading(true);
   *     const data = await getAllOffers();
   *     setOffers(data);
   *     setError(null);
   *   } catch (err) {
   *     setError(err instanceof Error ? err.message : "Failed to fetch offers");
   *   } finally {
   *     setIsLoading(false);
   *   }
   * }, []);
   *
   * Return refresh in the hook return value
   */

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

  /**
   * TODO: BACKEND - Add real-time updates
   *
   * Consider implementing WebSocket or Server-Sent Events (SSE) to:
   * - Receive updates when offers are created/updated by other users
   * - Auto-refresh offers list when changes occur
   * - Show notifications for real-time changes
   *
   * Implementation:
   * useEffect(() => {
   *   const ws = new WebSocket('/ws/admin/offers');
   *   ws.onmessage = (event) => {
   *     const update = JSON.parse(event.data);
   *     // Update offers list based on update type
   *     // update.type: 'created' | 'updated' | 'deleted'
   *     // update.data: Offer object
   *   };
   *   return () => ws.close();
   * }, []);
   */

  return {
    offers,
    isLoading,
    error,
    // TODO: Add refresh function here
  };
}
