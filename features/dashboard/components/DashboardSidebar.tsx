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
  FileText,
  MessageSquareReply,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
} from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar";
import { SignOutButton } from "@/features/auth/components/SignOutButton";

import { exampleUserProfile } from "../models/sidebar.config";
import type { IconName, SidebarMenuConfig } from "../types/sidebar.types";

const iconMap: Record<IconName, LucideIcon> = {
  LayoutDashboard,
  ClipboardList,
  MessageSquareReply,
  Megaphone,
  UsersRound,
  Target,
  ChartColumnIncreasing,
  Settings,
  Settings2,
  FileText,
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
  const router = useRouter();
  const { state } = useSidebar();
  const variables = getVariables();
  const isCollapsed = state === "collapsed";
  const isExpanded = state === "expanded";
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  const displayName = userName || exampleUserProfile.name;
  const displayEmail = userEmail || exampleUserProfile.email;

  useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(() => {
        setShowUserDetails(true);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setShowUserDetails(false);
    }
  }, [isExpanded]);

  useEffect(() => {
    const prefetchAllRoutes = () => {
      menuConfig.forEach((group) => {
        group.items.forEach((item) => {
          if (item.href && item.href !== pathname) {
            router.prefetch(item.href);
          }
        });
      });
    };

    const timer = setTimeout(prefetchAllRoutes, 500);
    return () => clearTimeout(timer);
  }, [menuConfig, pathname, router]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-2 py-4 bg-white">
        <div className="relative flex items-center justify-center min-h-[45px]">
          <div className="relative w-full flex items-center justify-center">
            {isExpanded && (
              <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-300">
                <Image
                  src={variables.logo.path}
                  alt={variables.logo.alt}
                  width={200}
                  height={60}
                  className="h-auto w-full max-w-[200px] object-contain"
                  priority
                  loading="eager"
                />
              </div>
            )}
            {isCollapsed && (
              <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-300">
                <Image
                  src={variables.secondaryLogo.path}
                  alt={variables.secondaryLogo.alt}
                  width={56}
                  height={56}
                  className="h-auto w-14 object-contain"
                  priority
                  loading="eager"
                />
              </div>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-white">
        {menuConfig.map((group) => (
          <SidebarGroup key={group.id}>
            {group.label && (
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="md:space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  const isHovered = hoveredItemId === item.id;
                  const Icon = iconMap[item.icon];

                  const shouldApplyActiveStyles = isActive || isHovered;

                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                        className="font-inter h-10 lg:h-11 xl:h-12.5 px-4 xl:px-5 py-3 font-medium transition-colors duration-200"
                        style={{
                          backgroundColor: shouldApplyActiveStyles
                            ? variables.colors.sidebarMenuItemActiveColor
                            : "transparent",
                          color: shouldApplyActiveStyles
                            ? variables.colors.sidebarMenuItemTextActiveColor
                            : variables.colors.sidebarMenuItemTextInactiveColor,
                        }}
                        onMouseEnter={() => {
                          setHoveredItemId(item.id);
                          if (!isActive && item.href) {
                            router.prefetch(item.href);
                          }
                        }}
                        onMouseLeave={() => setHoveredItemId(null)}
                      >
                        <Link href={item.href} prefetch={true}>
                          <Icon
                            style={{
                              color: shouldApplyActiveStyles
                                ? variables.colors
                                    .sidebarMenuItemIconActiveColor
                                : variables.colors
                                    .sidebarMenuItemIconInactiveColor,
                            }}
                          />
                          <span className="font-medium text-sm xl:text-[0.9rem] font-inter">
                            {item.label}
                          </span>
                          {item.badge && (
                            <span className="ml-auto  text-lg font-inter font-medium">
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

      <SidebarFooter
        className={isCollapsed ? "p-2" : "p-4"}
        style={{
          backgroundColor: variables.colors.sidebarFooterBackgroundColor,
        }}
      >
        <div className="space-y-2.5">
          {displayName && showUserDetails && (
            <div className="px-2 py-1.5 text-sm lg:text-[0.9rem]  transition-opacity duration-300">
              <p className="font-medium font-inter text-[#010101]">
                {displayName}
              </p>

              <p className="text-xs font-inter lg:text-[0.8rem]  text-[#6b7280]">
                {displayEmail}
              </p>
            </div>
          )}
          <div className={`flex ${isCollapsed ? "justify-center" : "w-full"}`}>
            <SignOutButton isCollapsed={isCollapsed} />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
