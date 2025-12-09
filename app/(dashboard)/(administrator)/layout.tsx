import { requireRole } from "@/lib/auth-helpers";

export default async function AdministratorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireRole("administrator");

  return <div className="h-screen overflow-y-auto">{children}</div>;
}
