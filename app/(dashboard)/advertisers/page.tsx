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
    <div>
      <Advertiser />
    </div>
  );
}
