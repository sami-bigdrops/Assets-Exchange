import { redirect } from "next/navigation";

import { Advertiser } from "@/features/admin";
import { getCurrentUser } from "@/lib/get-user";

export default async function AdvertisersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth");
  }

  if (user.role !== "admin") {
    redirect("/unauthorized");
  }

  return (
    <div className="container mx-auto p-6">
      <Advertiser />
    </div>
  );
}
