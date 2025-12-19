import { redirect } from "next/navigation";

import { Publisher } from "@/features/admin/components/Publisher";
import { getCurrentUser } from "@/lib/get-user";

export default async function PublishersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth");
  }

  if (user.role !== "admin") {
    redirect("/unauthorized");
  }

  return (
    <div>
      <Publisher />
    </div>
  );
}
