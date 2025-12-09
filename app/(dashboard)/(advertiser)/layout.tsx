import { requireRole } from "@/lib/auth-helpers";

export default async function AdvertiserLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireRole("advertiser");

  return <div className="h-screen overflow-y-auto">{children}</div>;
}
