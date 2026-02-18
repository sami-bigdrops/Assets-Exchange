import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { getRequestWithCreatives } from "@/features/admin/services/request.service";
import { auth } from "@/lib/auth";

import { CreativeReviewPageClient } from "./client";

export default async function CreativeReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    redirect("/sign-in");
  }

  const { id } = await params;
  const data = await getRequestWithCreatives(id);

  if (!data || !data.request) {
    notFound();
  }

  return (
    <CreativeReviewPageClient
      request={data.request}
      creatives={data.creatives}
    />
  );
}
