export type IconName =
  | "LayoutDashboard"
  | "ClipboardList"
  | "Megaphone"
  | "UsersRound"
  | "Target"
  | "ChartColumnIncreasing"
  | "Settings"
  | "Settings2";

export interface SidebarMenuItem {
  id: string;
  label: string;
  icon: IconName;
  href: string;
  badge?: string | number;
  children?: SidebarMenuItem[];
}

export interface SidebarMenuGroup {
  id: string;
  label?: string;
  items: SidebarMenuItem[];
}

export type SidebarMenuConfig = SidebarMenuGroup[];
