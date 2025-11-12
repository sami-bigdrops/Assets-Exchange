import { FaviconProvider } from "@/components/favicon-provider"
import { DashboardWrapper } from "@/components/dashboard-wrapper"

export default async function TenantLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ tenant: string }>
}>) {
  const { tenant } = await params

  return (
    <>
      <FaviconProvider tenant={tenant} />
      <DashboardWrapper tenant={tenant}>
        {children}
      </DashboardWrapper>
    </>
  )
}

