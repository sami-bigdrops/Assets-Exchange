import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import { getVariables } from "@/components/_variables/variables";
import { OfflineDetector } from "@/components/offline-detector";
import { Toaster } from "@/components/ui/sonner";

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
        <OfflineDetector />
        <div className="h-screen overflow-y-auto overflow-x-hidden">
          {children}
        </div>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
