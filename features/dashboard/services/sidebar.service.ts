import type { UserRole } from "@/features/auth/types/auth.types";

import { adminMenuConfig } from "../models/sidebar.config";
import type { SidebarMenuConfig } from "../types/sidebar.types";

/**
 * Service to get sidebar menu configuration based on user role
 */
export function getSidebarMenuConfig(role: UserRole): SidebarMenuConfig {
  switch (role) {
    case "admin":
      return adminMenuConfig;
    case "advertiser":
      // TODO: Add advertiser menu config when ready
      return [];
    case "administrator":
      // TODO: Add administrator menu config when ready
      return [];
    default:
      return [];
  }
}
