import type { ReactNode } from "react";

import { requireRole } from "@/lib/auth-helpers";

export default async function AdministratorLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  await requireRole("admin");

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {children}
    </div>
  );
}
