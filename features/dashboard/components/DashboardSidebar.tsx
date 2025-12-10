"use client";

import {
  LayoutDashboard,
  ClipboardList,
  Megaphone,
  UsersRound,
  Target,
  ChartColumnIncreasing,
  Settings,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { getVariables } from "@/components/_variables/variables";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { SignOutButton } from "@/features/auth/components/SignOutButton";

import type { IconName, SidebarMenuConfig } from "../types/sidebar.types";

const iconMap: Record<IconName, LucideIcon> = {
  LayoutDashboard,
  ClipboardList,
  Megaphone,
  UsersRound,
  Target,
  ChartColumnIncreasing,
  Settings,
  Settings2,
};

interface DashboardSidebarProps {
  menuConfig: SidebarMenuConfig;
  userName?: string;
  userEmail?: string;
}

export function DashboardSidebar({
  menuConfig,
  userName,
  userEmail,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const variables = getVariables();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <Image
            src={variables.logo.path}
            alt={variables.logo.alt}
            width={100}
            height={100}
            className="h-auto w-50 object-contain"
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {menuConfig.map((group) => (
          <SidebarGroup key={group.id}>
            {group.label && (
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = iconMap[item.icon];

                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                      >
                        <Link href={item.href}>
                          <Icon />
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className="ml-auto text-xs">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarSeparator className="mb-4" />
        <div className="space-y-2">
          {userName && (
            <div className="px-2 py-1.5 text-sm">
              <p className="font-medium">{userName}</p>
              {userEmail && (
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              )}
            </div>
          )}
          <div className="w-full">
            <SignOutButton />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
