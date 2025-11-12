"use client"

import { usePersonalization } from "@/hooks/use-personalization"
import { Favicon } from "./favicon"

interface FaviconProviderProps {
  tenant: string
}

export function FaviconProvider({ tenant }: FaviconProviderProps) {
  const { settings } = usePersonalization(tenant)
  return <Favicon href={settings?.favicon ?? null} />
}

