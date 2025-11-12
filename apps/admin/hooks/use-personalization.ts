"use client"

import { useEffect, useState } from "react"
import { PersonalizationSettings } from "@/lib/personalization"

export function usePersonalization(tenant: string, initialSettings?: PersonalizationSettings | null) {
  const [settings, setSettings] = useState<PersonalizationSettings | null>(initialSettings ?? null)
  const [loading, setLoading] = useState(initialSettings === undefined)

  useEffect(() => {
    if (initialSettings !== undefined) {
      setLoading(false)
      return
    }

    async function fetchPersonalization() {
      try {
        const response = await fetch(`/api/personalization/${tenant}`)
        if (response.ok) {
          const data = await response.json()
          setSettings(data)
        }
      } catch (error) {
        console.error("Error fetching personalization:", error)
      } finally {
        setLoading(false)
      }
    }

    if (tenant) {
      fetchPersonalization()
    }
  }, [tenant, initialSettings])

  return { settings, loading }
}

