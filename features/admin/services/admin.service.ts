import { dummyAdminDashboardData } from "../models/admin.model";
import type { AdminDashboardData } from "../types/admin.types";

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return dummyAdminDashboardData;
}
