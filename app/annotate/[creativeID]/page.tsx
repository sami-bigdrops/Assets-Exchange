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
  const { creativeID } = await params;
  const { requestId, action, mode } = await searchParams;
  const isShareableView = mode === "view";

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session && !isShareableView) {
    redirect("/auth");
  }

  const userRole = (session?.user?.role as string) ?? "";

  const creative = await db.query.creatives.findFirst({
    where: eq(creatives.id, creativeID),
  });

  if (!creative) {
    notFound();
  }

  // Check if it should be read-only based on stage
  let isViewOnly =
    mode === "view" ||
    !["admin", "advertiser", "administrator"].includes(userRole);

  if (requestId) {
    const { creativeRequests } = await import("@/lib/schema");
    const request = await db.query.creativeRequests.findFirst({
      where: eq(creativeRequests.id, requestId),
    });

    if (request) {
      const isAdvertiser = userRole === "advertiser";
      const isAdmin = userRole === "admin" || userRole === "administrator";

      if (isAdvertiser && request.approvalStage !== "advertiser") {
        isViewOnly = true;
      } else if (isAdmin && request.approvalStage !== "admin") {
        isViewOnly = true;
      }
    }
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
      userRole={userRole}
    />
  );
}
