"use client"

import { useEffect } from "react"

interface FaviconProps {
  href?: string | null
}

export function Favicon({ href }: FaviconProps) {
  useEffect(() => {
    if (!href) return

    const link =
      document.querySelector("link[rel='icon']") ||
      document.createElement("link")
    link.setAttribute("rel", "icon")
    link.setAttribute("href", href)
    link.setAttribute("type", href.startsWith("data:") ? "image/x-icon" : "image/png")

    if (!document.querySelector("link[rel='icon']")) {
      document.head.appendChild(link)
    }
  }, [href])

  return null
}

