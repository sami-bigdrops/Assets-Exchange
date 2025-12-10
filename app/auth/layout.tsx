import type { Metadata } from "next";

import { getVariables } from "@/components/_variables/variables";

const variables = getVariables();

export const metadata: Metadata = {
  title: `Authentication - ${variables.branding.appName}`,
  description: `Authentication - ${variables.branding.companyName}`,
  icons: {
    icon: variables.favicon.path,
  },
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="h-screen overflow-y-auto">{children}</div>;
}
