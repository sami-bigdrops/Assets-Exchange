import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getVariables } from "@/components/_variables/variables";
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
    <SidebarProvider>
      <DashboardSidebar
        menuConfig={menuConfig}
        userName={user.name}
        userEmail={user.email}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
        </header>
        <main className="flex-1 overflow-y-auto p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
