import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/get-user";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth");
  }

  return (
    <div className="h-screen overflow-y-auto">
      {children}
    </div>
  );
}