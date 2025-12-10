import { redirect } from "next/navigation";

import { AdminDashboard } from "@/features/admin";
import { getCurrentUser } from "@/lib/get-user";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth");
  }

  if (user.role === "admin") {
    return <AdminDashboard />;
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
