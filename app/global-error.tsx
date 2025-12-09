"use client";

import NextError from "next/error";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Error and reset are required by Next.js but not used in this implementation
  void error;
  void reset;

  return (
    <html>
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
