/**
 * TODO: BACKEND - Response Page Authentication & Authorization
 *
 * Same authentication requirements as requests page.
 * See /app/(dashboard)/requests/page.tsx for detailed authentication TODOs.
 *
 * Additional Requirements for Response Page:
 * - This page shows advertiser responses to admin's forwarded requests
 * - Ensure proper data isolation between different admin users if multi-tenant
 * - Implement audit logging for all response views
 */

import { redirect } from "next/navigation";

import { ManageResponsesPage } from "@/features/admin/components/ManageResponsesPage";
import { getCurrentUser } from "@/lib/get-user";

export default async function ResponsePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth");
  }

  if (user.role === "admin") {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <ManageResponsesPage />
      </div>
    );
  }

  /**
   * TODO: BACKEND - Implement Advertiser Response View
   *
   * For Advertiser users:
   * - Show responses they need to review
   * - Provide approve/reject actions
   * - Filter by their advertiser_id
   */
  return (
    <div className="flex items-center justify-center">
      <div>Response page for other roles coming soon...</div>
    </div>
  );
}
