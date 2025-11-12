"use client"

import Link from "next/link"
import { usePathname, useParams } from "next/navigation"
import {
  LayoutDashboard,
  Settings,
  Home,
  Paintbrush,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@workspace/ui/components/sidebar"
import { usePersonalization } from "@/hooks/use-personalization"
import { PersonalizationSettings } from "@/lib/personalization"

const menuItems = [
  {
    title: "Dashboard",
    path: "",
    icon: LayoutDashboard,
  },
  {
    title: "Personalization",
    path: "/personalization",
    icon: Paintbrush,
  }
]

interface AppSidebarProps {
  settings?: PersonalizationSettings | null
}

export function AppSidebar({ settings: settingsProp }: AppSidebarProps = {}) {
  const pathname = usePathname()
  const params = useParams()
  const tenant = params.tenant as string
  const { state } = useSidebar()
  const { settings: settingsFromHook } = usePersonalization(tenant, settingsProp)
  
  const settings = settingsProp ?? settingsFromHook

  // Determine which logo to show based on sidebar state
  // Expanded: show full company logo
  // Collapsed: show secondary/icon logo
  const isExpanded = state === "expanded"
  const logoToShow = isExpanded
    ? settings?.logo
    : settings?.secondaryLogo

  // Build CSS custom properties for personalized sidebar colors
  // These will override the default sidebar theme colors
  const sidebarStyle: React.CSSProperties & {
    [key: `--${string}`]: string
  } = {} as React.CSSProperties & { [key: `--${string}`]: string }
  
  // Apply personalized color scheme to sidebar
  if (settings?.colors) {
    // Base colors - body text color for default text and icons
    sidebarStyle["--sidebar"] = settings.colors.background
    sidebarStyle["--sidebar-foreground"] = settings.colors.bodyText
    sidebarStyle["--sidebar-primary"] = settings.colors.title
    sidebarStyle["--sidebar-primary-foreground"] = settings.buttonColors?.primaryButtonText || settings.colors.bodyText
    
    // Hover and selected state colors (background and text)
    sidebarStyle["--sidebar-accent"] = settings.colors.sidebarHoverBackground
    sidebarStyle["--sidebar-accent-foreground"] = settings.colors.sidebarHoverText
    
    // Border and ring colors
    sidebarStyle["--sidebar-border"] = settings.colors.sidebarHoverBackground
    sidebarStyle["--sidebar-ring"] = settings.colors.title
    
    // Icon color: same as body text by default, changes to hover text color on hover/selected
    // This is handled by CSS - icons inherit text color which changes on hover/selected
  }
  
  // Apply personalized button colors
  if (settings?.buttonColors) {
    sidebarStyle["--sidebar-button-primary"] = settings.buttonColors.primaryButton
    sidebarStyle["--sidebar-button-primary-foreground"] = settings.buttonColors.primaryButtonText
    sidebarStyle["--sidebar-button-secondary"] = settings.buttonColors.secondaryButton
    sidebarStyle["--sidebar-button-secondary-foreground"] = settings.buttonColors.secondaryButtonText
  }

  // Inline styles to completely disable all hover effects on logo button
  // Override the CSS variable that controls hover background color
  const logoButtonNoHoverStyle: React.CSSProperties & {
    [key: `--${string}`]: string
  } = {
    "--sidebar-accent": "transparent",  // Override accent color to transparent
    "--sidebar-accent-foreground": "inherit", // Keep text color unchanged
  } as React.CSSProperties & { [key: `--${string}`]: string }

  // CSS classes to completely disable all hover effects on logo button
  // Using multiple approaches to ensure no hover effects
  const logoButtonNoHoverClasses = [
    "hover:!bg-transparent",           // Remove background on hover
    "hover:!text-inherit",             // Keep text color unchanged on hover
    "active:!bg-transparent",          // Remove background on click
    "active:!text-inherit",            // Keep text color unchanged on click
    "[&[data-active=true]]:!bg-transparent", // Remove background when active
    "[&[data-active=true]]:!text-inherit",   // Keep text color unchanged when active
    "hover:!opacity-100",               // Prevent opacity changes on hover
    "!transition-none",                 // Disable all transitions
    "[&:hover]:!bg-transparent",         // Additional hover override with !important
    "[&:hover]:!text-inherit",            // Additional hover text override with !important
    "[&:active]:!bg-transparent",         // Additional active override with !important
    "[&:active]:!text-inherit",          // Additional active text override with !important
    "[&:hover]:!opacity-100",           // Prevent opacity on hover
  ].join(" ")

  return (
    <Sidebar collapsible="icon" style={sidebarStyle}>
      <SidebarHeader className={isExpanded ? "" : "pt-4"}>
        <SidebarMenu>
          <SidebarMenuItem>
            {/* Logo button with no hover effects - using both className and style to ensure override */}
            <SidebarMenuButton 
              size="lg" 
              asChild 
              className={logoButtonNoHoverClasses}
              style={logoButtonNoHoverStyle}
            >
              <Link 
                href={`/${tenant}`}
                className="hover:no-underline [&:hover]:bg-transparent [&:hover]:opacity-100"
                style={{ 
                  backgroundColor: "transparent",
                  color: "inherit",
                } as React.CSSProperties}
              >
                {logoToShow ? (
                  // Display uploaded logo (full logo when expanded, icon when collapsed)
                  <div className="flex w-full h-full items-center justify-start rounded-lg overflow-hidden">
                    <img
                      src={logoToShow}
                      alt="Company Logo"
                      className="h-full w-full object-contain pointer-events-none"
                    />
                  </div>
                ) : (
                  // Fallback: show home icon if no logo is uploaded
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <Home className="size-4" />
                  </div>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      {/* Navigation menu items */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className={isExpanded ? "" : "pt-6"}>
            <SidebarMenu>
              {menuItems.map((item) => {
                const href = `/${tenant}${item.path}`
                return (
                  <SidebarMenuItem key={item.title}>
                    {/* Navigation menu button with hover effects enabled */}
                    {/* Increased padding: applied directly to Link since asChild passes props to child */}
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === href}
                      tooltip={item.title}
                    >
                      <Link 
                        href={href}
                        data-active={pathname === href}
                        className="!py-6 !px-4 text-sidebar-foreground hover:text-sidebar-accent-foreground data-[active=true]:text-sidebar-accent-foreground [&>svg]:text-sidebar-foreground [&:hover>svg]:text-sidebar-accent-foreground [&[data-active=true]>svg]:text-sidebar-accent-foreground [&>span]:text-sidebar-foreground [&:hover>span]:text-sidebar-accent-foreground [&[data-active=true]>span]:text-sidebar-accent-foreground"
                        style={{ 
                          padding: "1.5rem 0.5rem",
                        } as React.CSSProperties}
                      >
                        <item.icon className="text-sidebar-foreground" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      {/* Footer with settings link */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {/* Settings button - shows icon and text when expanded */}
            <SidebarMenuButton size="lg" asChild>
              <Link 
                href={`/${tenant}/settings`}
                className="[&:hover>div>svg]:text-sidebar-accent-foreground [&[data-active=true]>div>svg]:text-sidebar-accent-foreground"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Settings className="size-4 text-sidebar-primary-foreground" />
                </div>
                {isExpanded && (
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold text-sidebar-foreground">Settings</span>
                    <span className="truncate text-xs text-sidebar-foreground">Manage preferences</span>
                  </div>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

