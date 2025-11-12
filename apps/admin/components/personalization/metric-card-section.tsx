"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { ColorInput } from "./color-input"

interface MetricCardSectionProps {
  colors: {
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
  onColorChange: (key: string, value: string) => void
}

export function MetricCardSection({ colors, onColorChange }: MetricCardSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Metric Card Colors</CardTitle>
        <CardDescription>
          Customize the appearance of dashboard metric cards. These colors will be applied to all metric cards on the dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <ColorInput
            label="Card Background Color"
            value={colors.cardBackground}
            onChange={(value) => onColorChange("cardBackground", value)}
            description="Background color for metric cards. This is the base color of each card."
          />
          <ColorInput
            label="Card Title Color"
            value={colors.cardTitle}
            onChange={(value) => onColorChange("cardTitle", value)}
            description="Color for the metric card title text (e.g., 'Total Assets', 'New Requests')."
          />
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="text-sm font-medium">Icon Colors</h4>
          <p className="text-xs text-muted-foreground">
            Customize icon background and icon colors for each metric card individually.
          </p>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-muted-foreground">Total Assets Icon</h5>
              <div className="grid gap-4 sm:grid-cols-2">
                <ColorInput
                  label="Icon Background"
                  value={colors.totalAssetsIconBg}
                  onChange={(value) => onColorChange("totalAssetsIconBg", value)}
                  description="Background color for Total Assets icon"
                />
                <ColorInput
                  label="Icon Color"
                  value={colors.totalAssetsIconColor}
                  onChange={(value) => onColorChange("totalAssetsIconColor", value)}
                  description="Color for Total Assets icon"
                />
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-medium text-muted-foreground">New Requests Icon</h5>
              <div className="grid gap-4 sm:grid-cols-2">
                <ColorInput
                  label="Icon Background"
                  value={colors.newRequestsIconBg}
                  onChange={(value) => onColorChange("newRequestsIconBg", value)}
                  description="Background color for New Requests icon"
                />
                <ColorInput
                  label="Icon Color"
                  value={colors.newRequestsIconColor}
                  onChange={(value) => onColorChange("newRequestsIconColor", value)}
                  description="Color for New Requests icon"
                />
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-medium text-muted-foreground">Approved Assets Icon</h5>
              <div className="grid gap-4 sm:grid-cols-2">
                <ColorInput
                  label="Icon Background"
                  value={colors.approvedAssetsIconBg}
                  onChange={(value) => onColorChange("approvedAssetsIconBg", value)}
                  description="Background color for Approved Assets icon"
                />
                <ColorInput
                  label="Icon Color"
                  value={colors.approvedAssetsIconColor}
                  onChange={(value) => onColorChange("approvedAssetsIconColor", value)}
                  description="Color for Approved Assets icon"
                />
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-medium text-muted-foreground">Rejected Assets Icon</h5>
              <div className="grid gap-4 sm:grid-cols-2">
                <ColorInput
                  label="Icon Background"
                  value={colors.rejectedAssetsIconBg}
                  onChange={(value) => onColorChange("rejectedAssetsIconBg", value)}
                  description="Background color for Rejected Assets icon"
                />
                <ColorInput
                  label="Icon Color"
                  value={colors.rejectedAssetsIconColor}
                  onChange={(value) => onColorChange("rejectedAssetsIconColor", value)}
                  description="Color for Rejected Assets icon"
                />
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-medium text-muted-foreground">Pending Approval Icon</h5>
              <div className="grid gap-4 sm:grid-cols-2">
                <ColorInput
                  label="Icon Background"
                  value={colors.pendingApprovalIconBg}
                  onChange={(value) => onColorChange("pendingApprovalIconBg", value)}
                  description="Background color for Pending Approval icon"
                />
                <ColorInput
                  label="Icon Color"
                  value={colors.pendingApprovalIconColor}
                  onChange={(value) => onColorChange("pendingApprovalIconColor", value)}
                  description="Color for Pending Approval icon"
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

