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
  } catch (error: any) {
    console.error("Error fetching offers:", error);

    const isQuota =
      error?.status === 503 ||
      error?.code === "COMPUTE_QUOTA_EXCEEDED" ||
      (typeof error?.message === "string" &&
        (error.message.includes("compute time quota") ||
          error.message.includes("compute time")));

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
