"use client"

import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { LogoSection } from "./logo-section"
import { ColorSection } from "./color-section"
import { ButtonSection } from "./button-section"
import { MetricCardSection } from "./metric-card-section"

interface PersonalizationFormData {
  logo?: string
  favicon?: string
  secondaryLogo?: string
  colors: {
    background: string
    bodyText: string
    title: string
    heading: string
    sidebarHoverBackground: string
    sidebarHoverText: string
    sectionHeaderBackground: string
    sectionHeadingTextColor: string
  }
  buttonColors: {
    primaryButton: string
    primaryButtonText: string
    secondaryButton: string
    secondaryButtonText: string
    destructiveButton: string
    destructiveButtonText: string
  }
  metricCardColors: {
    cardBackground: string
    cardTitle: string
    totalAssetsIconBg: string
    totalAssetsIconColor: string
    newRequestsIconBg: string
    newRequestsIconColor: string
    approvedAssetsIconBg: string
    approvedAssetsIconColor: string
    rejectedAssetsIconBg: string
    rejectedAssetsIconColor: string
    pendingApprovalIconBg: string
    pendingApprovalIconColor: string
  }
}

interface PersonalizationFormProps {
  initialData?: Partial<PersonalizationFormData>
  onSubmit?: (data: PersonalizationFormData) => void
}

const defaultColors = {
  background: "#ffffff",
  bodyText: "#1f2937",
  title: "#111827",
  heading: "#374151",
  sidebarHoverBackground: "#f3f4f6",
  sidebarHoverText: "#111827",
  sectionHeaderBackground: "#ffffff",
  sectionHeadingTextColor: "#111827",
}

const defaultButtonColors = {
  primaryButton: "#3b82f6",
  primaryButtonText: "#ffffff",
  secondaryButton: "#e5e7eb",
  secondaryButtonText: "#000000",
  destructiveButton: "#ef4444",
  destructiveButtonText: "#ffffff",
}

const defaultMetricCardColors = {
  cardBackground: "#ffffff",
  cardTitle: "#6b7280",
  totalAssetsIconBg: "#ebe4ff",
  totalAssetsIconColor: "#5B3E96",
  newRequestsIconBg: "#dbeafe",
  newRequestsIconColor: "#1E40AF",
  approvedAssetsIconBg: "#DAF3DC",
  approvedAssetsIconColor: "#14532D",
  rejectedAssetsIconBg: "#FFEDE3",
  rejectedAssetsIconColor: "#FF8743",
  pendingApprovalIconBg: "#DBFBFC",
  pendingApprovalIconColor: "#006D77",
}

export function PersonalizationForm({
  initialData,
  onSubmit,
}: PersonalizationFormProps) {
  const [formData, setFormData] = useState<PersonalizationFormData>({
    logo: initialData?.logo,
    favicon: initialData?.favicon,
    secondaryLogo: initialData?.secondaryLogo,
    colors: {
      ...defaultColors,
      ...initialData?.colors,
    },
    buttonColors: {
      ...defaultButtonColors,
      ...initialData?.buttonColors,
    },
    metricCardColors: {
      ...defaultMetricCardColors,
      ...initialData?.metricCardColors,
    },
  })

  const handleLogoChange = (logo: string | undefined) => {
    setFormData((prev) => ({ ...prev, logo }))
  }

  const handleFaviconChange = (favicon: string | undefined) => {
    setFormData((prev) => ({ ...prev, favicon }))
  }

  const handleSecondaryLogoChange = (secondaryLogo: string | undefined) => {
    setFormData((prev) => ({ ...prev, secondaryLogo }))
  }

  const handleColorChange = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        [key]: value,
      },
    }))
  }

  const handleButtonColorChange = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      buttonColors: {
        ...prev.buttonColors,
        [key]: value,
      },
    }))
  }

  const handleMetricCardColorChange = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      metricCardColors: {
        ...prev.metricCardColors,
        [key]: value,
      },
    }))
  }

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit?.(formData)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setFormData({
      logo: initialData?.logo,
      favicon: initialData?.favicon,
      secondaryLogo: initialData?.secondaryLogo,
      colors: {
        ...defaultColors,
        ...initialData?.colors,
      },
      buttonColors: {
        ...defaultButtonColors,
        ...initialData?.buttonColors,
      },
      metricCardColors: {
        ...defaultMetricCardColors,
        ...initialData?.metricCardColors,
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <LogoSection
        logo={formData.logo}
        favicon={formData.favicon}
        secondaryLogo={formData.secondaryLogo}
        onLogoChange={handleLogoChange}
        onFaviconChange={handleFaviconChange}
        onSecondaryLogoChange={handleSecondaryLogoChange}
      />
      <ColorSection colors={formData.colors} onColorChange={handleColorChange} />
      <ButtonSection
        colors={formData.buttonColors}
        onColorChange={handleButtonColorChange}
      />
      <MetricCardSection
        colors={formData.metricCardColors}
        onColorChange={handleMetricCardColorChange}
      />

      <div className="flex justify-end gap-4 pt-4">
        <Button type="button" variant="outline" onClick={handleReset}>
          Reset
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  )
}

