"use client"

import { Loader2 } from "lucide-react"

export function DashboardLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-medium">Loading Dashboard</p>
        </div>
      </div>
    </div>
  )
}

