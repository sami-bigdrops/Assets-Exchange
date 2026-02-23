import { redirect } from "next/navigation";

import { AdminDashboard } from "@/features/admin/components/AdminDashboard";
import { AdvertiserDashboard } from "@/features/advertiser/components/AdvertiserDashboard";
import { getCurrentUser } from "@/lib/get-user";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth");
  }

  if (user.role === "admin" || user.role === "administrator") {
    return <AdminDashboard />;
  }

  if (user.role === "advertiser") {
    return <AdvertiserDashboard />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Welcome, {user.name}!</h1>
        <p className="text-muted-foreground">
          Dashboard for {user.role} role is coming soon.
        </p>
      </div>
    </div>
  );
}
