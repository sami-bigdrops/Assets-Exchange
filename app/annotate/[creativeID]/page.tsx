import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { creatives } from "@/lib/schema";

import { AnnotatePageClient } from "./AnnotatePageClient";

export default async function AnnotatePage({
  params,
  searchParams,
}: {
  params: Promise<{ creativeID: string }>;
  searchParams: Promise<{ requestId?: string; action?: string; mode?: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth");
  }

  const userRole = (session.user.role as string) ?? "";

  const { creativeID } = await params;
  const { requestId, action, mode } = await searchParams;
  const isViewOnly =
    mode === "view" || !["admin", "advertiser"].includes(userRole);

  const creative = await db.query.creatives.findFirst({
    where: eq(creatives.id, creativeID),
  });

  if (!creative) {
    notFound();
  }

  const creativeType = creative.type.toLowerCase().includes("image")
    ? "image"
    : "html";

  return (
    <AnnotatePageClient
      creativeId={creative.id}
      creativeUrl={creative.url}
      creativeType={creativeType}
      fileName={creative.name}
      fileTypeLabel={creative.type?.split("/").pop() ?? creativeType}
      fileSize={creative.size ?? 0}
      requestId={requestId ?? undefined}
      action={
        action === "send-back" || action === "reject" ? action : undefined
      }
      readOnly={isViewOnly}
    />
  );
}
