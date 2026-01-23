import type { Metadata } from "next";

import { getVariables } from "@/components/_variables";

export const metadata: Metadata = {
  title: "Thank You - Creative Submission",
  description:
    "Thank you for submitting your creative. Your tracking information has been sent to your email.",
};

const variables = getVariables();

export default function ThankYouLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ backgroundColor: variables.colors.background }}>
      {children}
    </div>
  );
}
