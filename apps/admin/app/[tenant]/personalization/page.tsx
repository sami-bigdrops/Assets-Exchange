"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { TwoColumnLayout } from "@/components/personalization/two-column-layout"
import { PersonalizationForm } from "@/components/personalization/personalization-form"
import { usePersonalization } from "@/hooks/use-personalization"

export default function PersonalizationPage() {
  const params = useParams()
  const tenant = params.tenant as string
  const { settings, loading } = usePersonalization(tenant)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(null)

  const handleSubmit = async (data: unknown) => {
    setSaving(true)
    setSaveStatus(null)

    try {
      const response = await fetch(`/api/personalization/${tenant}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        setSaveStatus("success")
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        setSaveStatus("error")
      }
    } catch (error) {
      console.error("Error saving personalization:", error)
      setSaveStatus("error")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-medium">Loading Personalization</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Personalization</h1>
        <p className="text-muted-foreground mt-2">
          Customize the appearance and branding of your application
        </p>
        {saveStatus === "success" && (
          <div className="mt-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800">
            Settings saved successfully! Refreshing...
          </div>
        )}
        {saveStatus === "error" && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
            Failed to save settings. Please try again.
          </div>
        )}
      </div>

      <TwoColumnLayout
        leftColumn={
          <PersonalizationForm
            initialData={
              settings
                ? {
                    logo: settings.logo ?? undefined,
                    favicon: settings.favicon ?? undefined,
                    secondaryLogo: settings.secondaryLogo ?? undefined,
                    colors: settings.colors ?? undefined,
                    buttonColors: settings.buttonColors ?? undefined,
                    metricCardColors: settings.metricCardColors ?? undefined,
                  }
                : undefined
            }
            onSubmit={handleSubmit}
          />
        }
      />
    </div>
  )
}
