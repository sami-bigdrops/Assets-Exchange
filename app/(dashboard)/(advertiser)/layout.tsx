import type { ReactNode } from "react";

import { requireRole } from "@/lib/auth-helpers";

export default async function AdvertiserLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  await requireRole("advertiser");

  return <div className="h-screen overflow-y-auto">{children}</div>;
}
