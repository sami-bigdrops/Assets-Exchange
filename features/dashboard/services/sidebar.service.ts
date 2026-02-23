import type { UserRole } from "@/features/auth/types/auth.types";

import {
  adminMenuConfig,
  advertiserMenuConfig,
} from "../models/sidebar.config";
import type { SidebarMenuConfig } from "../types/sidebar.types";

/**
 * Service to get sidebar menu configuration based on user role
 */
export function getSidebarMenuConfig(role: UserRole): SidebarMenuConfig {
  switch (role) {
    case "admin":
      return adminMenuConfig;
    case "advertiser":
      return advertiserMenuConfig;
    case "administrator":
      return adminMenuConfig;
    default:
      return [];
  }
}
