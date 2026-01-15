import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import { getVariables } from "@/components/_variables/variables";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";
import { Toaster } from "@/components/ui/sonner";
import { GlobalSyncIndicator } from "@/features/admin/components/GlobalSyncIndicator";
import { GlobalSyncProvider } from "@/features/admin/context/GlobalSyncContext";

const variables = getVariables();

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: variables.branding.appName,
  description: variables.branding.companyName,
  icons: {
    icon: variables.favicon.path,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        {/* Temporarily disabled for testing - TODO: Fix client component import in server layout */}
        {/* <OfflineDetectorWrapper /> */}
        <GlobalSyncProvider>
          {children}
          <GlobalSyncIndicator />
        </GlobalSyncProvider>
        <Toaster position="top-right" richColors />
        <ConfirmDialogProvider />
      </body>
    </html>
  );
}
