import { getPersonalizationByTenantSlug } from "@/lib/personalization"
import { DashboardPageClient } from "./dashboard-page-client"

export default async function Page({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant } = await params
  const personalizationSettings = await getPersonalizationByTenantSlug(tenant)

  return (
    <DashboardPageClient
      tenant={tenant}
      initialPersonalization={personalizationSettings}
    />
  )
}
