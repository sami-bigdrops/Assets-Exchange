import { redirect } from "next/navigation";

import { Offers } from "@/features/admin";
import { getCurrentUser } from "@/lib/get-user";

export default async function OffersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth");
  }

  if (user.role !== "admin") {
    redirect("/unauthorized");
  }

  return (
    <div>
      <Offers />
    </div>
  );
}
