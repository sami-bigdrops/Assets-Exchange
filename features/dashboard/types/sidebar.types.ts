export type IconName =
  | "LayoutDashboard"
  | "ClipboardList"
  | "MessageSquareReply"
  | "Megaphone"
  | "UsersRound"
  | "Target"
  | "ChartColumnIncreasing"
  | "Settings"
  | "Settings2"
  | "FileText";

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

export interface UserProfileConfig {
  name: string;
  phone?: string;
  email: string;
}
