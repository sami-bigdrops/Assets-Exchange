"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { ColorInput } from "./color-input"

interface ButtonSectionProps {
  colors: {
    primaryButton: string
    primaryButtonText: string
    secondaryButton: string
    secondaryButtonText: string
    destructiveButton: string
    destructiveButtonText: string
  }
  onColorChange: (key: string, value: string) => void
}

export function ButtonSection({ colors, onColorChange }: ButtonSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Button Colors</CardTitle>
        <CardDescription>
          Customize button colors and text colors
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Primary Button</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorInput
              label="Background"
              value={colors.primaryButton}
              onChange={(value) => onColorChange("primaryButton", value)}
              description="Primary button background"
            />
            <ColorInput
              label="Text Color"
              value={colors.primaryButtonText}
              onChange={(value) => onColorChange("primaryButtonText", value)}
              description="Primary button text color"
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="text-sm font-medium">Secondary Button</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorInput
              label="Background"
              value={colors.secondaryButton}
              onChange={(value) => onColorChange("secondaryButton", value)}
              description="Secondary button background"
            />
            <ColorInput
              label="Text Color"
              value={colors.secondaryButtonText}
              onChange={(value) => onColorChange("secondaryButtonText", value)}
              description="Secondary button text color"
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="text-sm font-medium">Destructive Button</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorInput
              label="Background"
              value={colors.destructiveButton}
              onChange={(value) => onColorChange("destructiveButton", value)}
              description="Destructive button background"
            />
            <ColorInput
              label="Text Color"
              value={colors.destructiveButtonText}
              onChange={(value) =>
                onColorChange("destructiveButtonText", value)
              }
              description="Destructive button text color"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

