import type { ReactNode } from "react";

import { requireRole } from "@/lib/auth-helpers";

export default async function AdministratorLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  await requireRole("administrator");

  return <div className="h-screen overflow-y-auto">{children}</div>;
}
