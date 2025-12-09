import { redirect } from "next/navigation";

import { getCurrentUser } from "./get-user";

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  return user;
}

export async function requireRole(
  role: "admin" | "advertiser" | "administrator"
) {
  const user = await requireAuth();

  if (user.role !== role) {
    redirect("/unauthorized");
  }

  return user;
}
