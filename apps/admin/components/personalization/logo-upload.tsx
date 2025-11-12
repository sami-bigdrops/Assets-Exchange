"use client"

import { useState, useId } from "react"
import { Upload, X } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Label } from "@workspace/ui/components/label"
import { cn } from "@workspace/ui/lib/utils"

interface LogoUploadProps {
  label: string
  value?: string
  onChange: (value: string | undefined) => void
  description?: string
  className?: string
}

export function LogoUpload({
  label,
  value,
  onChange,
  description,
  className,
}: LogoUploadProps) {
  const [preview, setPreview] = useState<string | undefined>(value)
  const inputId = useId()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setPreview(result)
        onChange(result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemove = () => {
    setPreview(undefined)
    onChange(undefined)
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={inputId}>{label}</Label>
      {preview ? (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Logo preview"
            className="h-24 w-auto rounded-lg border object-contain"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
            onClick={handleRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <label htmlFor={inputId}>
            <Button type="button" variant="outline" asChild>
              <span>
                <Upload className="mr-2 h-4 w-4" />
                Upload Logo
              </span>
            </Button>
            <input
              id={inputId}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      )}
      {description && (
        <p className="text-muted-foreground text-xs">{description}</p>
      )}
    </div>
  )
}

