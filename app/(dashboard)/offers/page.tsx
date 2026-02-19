import { redirect } from "next/navigation";

import { Offers } from "@/features/admin";
import { getCurrentUser } from "@/lib/get-user";

export default async function OffersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth");
  }

  const allowedRoles = ["admin", "administrator", "advertiser"];
  if (!allowedRoles.includes(user.role)) {
    redirect("/unauthorized");
  }

  return (
    <div>
      <Offers />
    </div>
  );
}
