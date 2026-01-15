"use client";

import { useState, useCallback, useEffect } from "react"

import { fetchAdvertisers, createAdvertiser, updateAdvertiser, deleteAdvertiser } from "@/features/admin/services/advertisers.client"
import { type Advertiser } from "@/features/admin/types/advertiser.types"

export function useAdvertiserViewModel() {
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (search?: string) => {
    try {
      setIsLoading(true)
      const res = await fetchAdvertisers({ search })
      setAdvertisers(res)
      setError(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const onCreate = async (name: string, contactEmail?: string) => {
    try {
      await createAdvertiser({ name, contactEmail })
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      throw e
    }
  }

  const onUpdate = async (id: string, updates: Partial<Advertiser>) => {
    try {
      await updateAdvertiser(id, updates)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      throw e
    }
  }

  const onDelete = async (id: string) => {
    try {
      await deleteAdvertiser(id)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  useEffect(() => {
    load()
  }, [load])

  return {
    advertisers,
    isLoading,
    error,
    refresh: load,
    onCreate,
    onUpdate,
    onDelete
  }
}
