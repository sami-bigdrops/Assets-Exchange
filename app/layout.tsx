import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import { getVariables } from "@/components/_variables/variables";

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
        <div className="h-screen overflow-y-auto">{children}</div>
      </body>
    </html>
  );
}
