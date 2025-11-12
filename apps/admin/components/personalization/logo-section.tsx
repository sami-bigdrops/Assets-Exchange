"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { LogoUpload } from "./logo-upload"

interface LogoSectionProps {
  logo?: string
  favicon?: string
  secondaryLogo?: string
  onLogoChange: (logo: string | undefined) => void
  onFaviconChange: (favicon: string | undefined) => void
  onSecondaryLogoChange: (secondaryLogo: string | undefined) => void
}

export function LogoSection({
  logo,
  favicon,
  secondaryLogo,
  onLogoChange,
  onFaviconChange,
  onSecondaryLogoChange,
}: LogoSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Logo & Icons</CardTitle>
        <CardDescription>
          Upload your brand logos and icons. Supported formats: PNG, JPG, SVG, ICO
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <LogoUpload
          label="Company Logo"
          value={logo}
          onChange={onLogoChange}
          description="Recommended size: 200x50px or larger. Max file size: 2MB"
        />

        <Separator />

        <LogoUpload
          label="Favicon"
          value={favicon}
          onChange={onFaviconChange}
          description="Recommended size: 32x32px or 16x16px. Formats: ICO, PNG. Max file size: 100KB"
        />

        <Separator />

        <LogoUpload
          label="Secondary Logo (Icon Only)"
          value={secondaryLogo}
          onChange={onSecondaryLogoChange}
          description="Square icon logo for mobile apps and compact spaces. Recommended size: 512x512px. Max file size: 2MB"
        />
      </CardContent>
    </Card>
  )
}

