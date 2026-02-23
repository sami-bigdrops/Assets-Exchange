import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/get-user";

import { EmailTestForm } from "./EmailTestForm";

export default async function EmailTestPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");
  if (user.role !== "admin" && user.role !== "administrator") {
    redirect("/unauthorized");
  }
  return <EmailTestForm />;
}
