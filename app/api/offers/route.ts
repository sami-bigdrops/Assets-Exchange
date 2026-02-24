import { NextResponse } from "next/server";

import { listOffers } from "@/features/admin/services/offer.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const offersList = await listOffers({ status: "Active" });
    const offerData = offersList.map((offer) => ({
      id: offer.id,
      offerId: offer.offerId,
    }));

    return NextResponse.json(offerData);
  } catch (error: unknown) {
    console.error("Error fetching offers:", error);

    const err = error as {
      status?: number;
      code?: string;
      message?: string;
    } | null;

    const isQuota =
      err?.status === 503 ||
      err?.code === "COMPUTE_QUOTA_EXCEEDED" ||
      (typeof err?.message === "string" &&
        (err.message.includes("compute time quota") ||
          err.message.includes("compute time")));

    if (isQuota) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "Service temporarily unavailable",
          },
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      },
      { status: 500 }
    );
  }
}
