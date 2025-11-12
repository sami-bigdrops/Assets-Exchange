"use client"

import { cn } from "@workspace/ui/lib/utils"

interface TwoColumnLayoutProps {
  leftColumn: React.ReactNode
  rightColumn?: React.ReactNode
  className?: string
}

export function TwoColumnLayout({
  leftColumn,
  rightColumn,
  className,
}: TwoColumnLayoutProps) {
  return (
    <div className={cn("grid gap-6", className)}>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">{leftColumn}</div>
        <div className="space-y-6">
          {rightColumn || (
            <div className="flex h-full min-h-[400px] items-center justify-center rounded-lg border border-dashed text-muted-foreground">
              <p className="text-sm">Right column - Coming soon</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

