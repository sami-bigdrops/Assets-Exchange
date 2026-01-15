import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getVariables } from "@/components/_variables/variables";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LastUpdated } from "@/components/ui/last-updated";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/features/dashboard";
import { getSidebarMenuConfig } from "@/features/dashboard/services/sidebar.service";
import { getCurrentUser } from "@/lib/get-user";

const variables = getVariables();

export async function generateMetadata(): Promise<Metadata> {
  const user = await getCurrentUser();

  return {
    title: user
      ? `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} - ${variables.branding.appName}`
      : `Dashboard - ${variables.branding.appName}`,
    description: user
      ? `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} - ${variables.branding.companyName}`
      : `Dashboard - ${variables.branding.companyName}`,
    icons: {
      icon: variables.favicon.path,
    },
  };
}

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth");
  }

  const menuConfig = getSidebarMenuConfig(user.role);

  return (
    <SidebarProvider className="h-screen overflow-y-auto overflow-x-hidden">
      <DashboardSidebar
        menuConfig={menuConfig}
        userName={user.name}
        userEmail={user.email}
      />
      <SidebarInset>
        <header
          className="sticky top-0 z-10 flex h-16 xl:h-19 shrink-0 items-center justify-between gap-2 border-b px-4"
          style={{
            backgroundColor: variables.colors.headerBackgroundColor,
          }}
        >
          <div
            style={{
              color: variables.colors.headerTextColor,
            }}
          >
            <SidebarTrigger />
          </div>
          <div
            style={{
              color: variables.colors.headerTextColor,
            }}
          >
            <LastUpdated />
          </div>
        </header>
        <main className="flex-1 p-4">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
