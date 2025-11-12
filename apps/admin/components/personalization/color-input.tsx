"use client"

import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { cn } from "@workspace/ui/lib/utils"

interface ColorInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  description?: string
  className?: string
}

export function ColorInput({
  label,
  value,
  onChange,
  description,
  className,
}: ColorInputProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={label.toLowerCase().replace(/\s+/g, "-")}>
        {label}
      </Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            id={label.toLowerCase().replace(/\s+/g, "-")}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
            className="pr-10"
          />
          <div
            className="pointer-events-none absolute right-2 top-1/2 h-5 w-5 -translate-y-1/2 rounded border border-border"
            style={{ backgroundColor: value }}
          />
        </div>
        <Input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-16 cursor-pointer"
        />
      </div>
      {description && (
        <p className="text-muted-foreground text-xs">{description}</p>
      )}
    </div>
  )
}

