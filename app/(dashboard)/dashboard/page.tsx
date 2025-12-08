import { getCurrentUser } from "@/lib/get-user";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/features/auth/components/SignOutButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth");
  }

  // Show role-based dashboard content
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl">Welcome, {user.name}!</CardTitle>
              <CardDescription className="mt-2">
                You are successfully authenticated
              </CardDescription>
            </div>
            <SignOutButton />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Role:</span>
              <Badge variant="default" className="capitalize">
                {user.role}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Email:</span>
              <span className="text-sm text-muted-foreground">{user.email}</span>
            </div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              ✅ Role-based authentication is working correctly. You have access to the{" "}
              <span className="font-semibold capitalize">{user.role}</span> dashboard.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

