import { requireRole } from "@/lib/auth-helpers";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireRole("admin");

  return <div className="h-screen overflow-y-auto">{children}</div>;
}
