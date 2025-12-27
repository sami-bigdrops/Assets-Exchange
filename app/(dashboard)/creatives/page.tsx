/**
 * TODO: BACKEND - Authentication & Authorization
 *
 * Current Implementation:
 * - getCurrentUser() needs to be implemented to fetch user from session/JWT
 * - Replace with actual authentication service
 *
 * Required Backend Support:
 * 1. Implement JWT token validation middleware
 * 2. Create session management system
 * 3. Implement role-based access control (RBAC)
 *
 * Security Requirements:
 * - Verify JWT token signature
 * - Check token expiration
 * - Validate user role from database (don't trust client-side role)
 * - Implement refresh token mechanism
 * - Log all authentication attempts
 * - Rate limit authentication endpoints
 *
 * Authorization Flow:
 * - Admin users: Full access to all approved/rejected creatives
 * - Publisher users: Can only see their own approved/rejected creatives
 * - Advertiser users: Can only see creatives they approved/rejected
 *
 * Session Management:
 * - Store sessions in Redis for scalability
 * - Implement session timeout (e.g., 24 hours)
 * - Handle concurrent sessions policy
 * - Provide logout/revoke session functionality
 */

import { redirect } from "next/navigation";

import { ManageCreativesPage } from "@/features/admin";
import { getCurrentUser } from "@/lib/get-user";

export default async function CreativesPage() {
  /**
   * TODO: BACKEND - Replace getCurrentUser with actual auth service
   *
   * Example implementation:
   * const session = await getServerSession();
   * if (!session) {
   *   redirect("/auth");
   * }
   *
   * const user = await fetchUserFromDatabase(session.userId);
   * if (!user || user.role !== 'admin') {
   *   return <Forbidden />;
   * }
   */
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth");
  }

  if (user.role === "admin") {
    return <ManageCreativesPage />;
  }

  /**
   * TODO: BACKEND - Implement Publisher/Advertiser Views
   *
   * For Publisher users:
   * - Show only their approved/rejected creatives
   * - Filter API calls by publisher_id: GET /api/publisher/creatives?publisherId={id}&status=approved|rejected
   *
   * For Advertiser users:
   * - Show only creatives they approved/rejected
   * - Filter API calls by advertiser_id: GET /api/advertiser/creatives?advertiserId={id}&status=approved|rejected
   */
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Manage Creatives</h1>
        <p className="text-muted-foreground">
          Creative management for {user.role} role is coming soon.
        </p>
      </div>
    </div>
  );
}
