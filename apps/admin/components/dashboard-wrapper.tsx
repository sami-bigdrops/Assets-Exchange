"use client"

import { SidebarProvider, SidebarTrigger, SidebarInset } from "@workspace/ui/components/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardLoader } from "@/components/dashboard-loader"
import { usePersonalization } from "@/hooks/use-personalization"

interface DashboardWrapperProps {
  children: React.ReactNode
  tenant: string
}

export function DashboardWrapper({ children, tenant }: DashboardWrapperProps) {
  const { settings, loading } = usePersonalization(tenant)

  if (loading) {
    return <DashboardLoader />
  }

  return (
    <SidebarProvider>
      <AppSidebar settings={settings} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

