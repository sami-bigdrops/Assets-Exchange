"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { ColorInput } from "./color-input"

interface ColorSectionProps {
  colors: {
    background: string
    bodyText: string
    title: string
    heading: string
    sidebarHoverBackground: string
    sidebarHoverText: string
  }
  onColorChange: (key: string, value: string) => void
}

export function ColorSection({ colors, onColorChange }: ColorSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Color Scheme</CardTitle>
        <CardDescription>
          Customize the color palette for your brand. These colors will be applied across your dashboard and user-facing portals.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Content Colors */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Main Content Colors</h4>
          <p className="text-xs text-muted-foreground">
            Colors for the main content area of your application
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorInput
              label="Background Color"
              value={colors.background}
              onChange={(value) => onColorChange("background", value)}
              description="Main background color for pages and content areas. This is the base color behind all content."
            />
            <ColorInput
              label="Body Text Color"
              value={colors.bodyText}
              onChange={(value) => onColorChange("bodyText", value)}
              description="Color for regular body text, paragraphs, and general content. Should have good contrast with the background."
            />
          </div>
        </div>

        <Separator />

        {/* Typography Colors */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Typography Colors</h4>
          <p className="text-xs text-muted-foreground">
            Colors for headings and titles throughout your application
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorInput
              label="Title Color"
              value={colors.title}
              onChange={(value) => onColorChange("title", value)}
              description="Color for page titles and main headings (H1). Typically darker or more prominent than body text."
            />
            <ColorInput
              label="Heading Color"
              value={colors.heading}
              onChange={(value) => onColorChange("heading", value)}
              description="Color for section headings (H2, H3, etc.). Should be distinct from body text but readable."
            />
          </div>
        </div>

        <Separator />

        {/* Sidebar Colors */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Sidebar Colors</h4>
          <p className="text-xs text-muted-foreground">
            Colors for sidebar navigation items. These colors apply to both hover and selected states.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorInput
              label="Sidebar Options Hover Color (Background)"
              value={colors.sidebarHoverBackground}
              onChange={(value) => onColorChange("sidebarHoverBackground", value)}
              description="Background color when hovering over sidebar menu items. This same color is also used for the selected/active menu item."
            />
            <ColorInput
              label="Sidebar Options Hover Color (Text)"
              value={colors.sidebarHoverText}
              onChange={(value) => onColorChange("sidebarHoverText", value)}
              description="Text color when hovering over sidebar menu items. This same color is also used for the selected/active menu item text."
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

