import { eq, or, and, inArray } from "drizzle-orm"

import { db } from "@/lib/db"
import { advertisers, offers } from "@/lib/schema"

export async function attachBrandGuidelines(
    offerId: string,
    fileId: string,
    adminId: string
) {
    // TODO: Re-enable file validation when fileUploads table is created (Phase 8.1)
    // const [file] = await db
    //     .select()
    //     .from(fileUploads)
    //     .where(eq(fileUploads.id, fileId))
    // if (!file) throw new Error("File not found")
    // if (file.status !== "clean") throw new Error("File is not clean")
    // if (file.deletedAt) throw new Error("File is deleted")

    const [offer] = await db.select().from(offers).where(eq(offers.id, offerId))
    if (!offer) throw new Error("Offer not found")

    await db.update(offers)
        .set({
            brandGuidelines: {
                fileId,
                attachedAt: new Date().toISOString(),
                attachedBy: adminId,
                type: "file",
            } as { fileId: string; attachedAt: string; attachedBy: string; type: string },
            updatedAt: new Date(),
        })
        .where(eq(offers.id, offerId))
}

export async function attachOfferBrandGuidelines(
    offerId: string,
    brandGuidelines: {
        type: "url" | "file" | "text";
        url?: string;
        fileUrl?: string;
        fileName?: string;
        fileSize?: number;
        mimeType?: string;
        text?: string;
        notes?: string;
    },
    adminId: string
) {
    const [offer] = await db.select().from(offers).where(eq(offers.id, offerId))
    if (!offer) {
        throw new Error("Offer not found")
    }

    const brandGuidelinesData = {
        ...brandGuidelines,
        attachedAt: new Date().toISOString(),
        attachedBy: adminId,
    }

    await db.update(offers)
        .set({
            brandGuidelines: brandGuidelinesData as { type: "url" | "file" | "text"; url?: string; fileUrl?: string; fileName?: string; fileSize?: number; mimeType?: string; text?: string; notes?: string; fileId?: string; attachedAt?: string; attachedBy?: string } | null,
            updatedAt: new Date(),
        })
        .where(eq(offers.id, offerId))
}

export async function detachBrandGuidelines(offerId: string) {
    const [offer] = await db.select().from(offers).where(eq(offers.id, offerId))
    if (!offer) throw new Error("Offer not found")

    await db.update(offers)
        .set({
            brandGuidelines: null,
            updatedAt: new Date(),
        })
        .where(eq(offers.id, offerId))
}

export async function attachAdvertiserBrandGuidelines(
    advertiserId: string,
    brandGuidelines: {
        type: "url" | "file" | "text";
        url?: string;
        fileUrl?: string;
        fileName?: string;
        fileSize?: number;
        mimeType?: string;
        text?: string;
        notes?: string;
    },
    adminId: string
) {
    const [advertiser] = await db.select().from(advertisers).where(eq(advertisers.id, advertiserId))
    if (!advertiser) {
        throw new Error("Advertiser not found")
    }

    const oldBrandGuidelines = advertiser.brandGuidelines ? JSON.parse(JSON.stringify(advertiser.brandGuidelines)) : null;

    const brandGuidelinesData = {
        ...brandGuidelines,
        attachedAt: new Date().toISOString(),
        attachedBy: adminId,
    }

    await db.update(advertisers)
        .set({
            brandGuidelines: brandGuidelinesData as { type: "url" | "file" | "text"; url?: string; fileUrl?: string; fileName?: string; fileSize?: number; mimeType?: string; text?: string; notes?: string; fileId?: string; attachedAt?: string; attachedBy?: string } | null,
            updatedAt: new Date(),
        })
        .where(eq(advertisers.id, advertiserId))

    const advertiserEverflowId = advertiser.everflowAdvertiserId;

    if (!advertiserEverflowId) {
        const advertiserOffers = await db
            .select({ id: offers.id, brandGuidelines: offers.brandGuidelines })
            .from(offers)
            .where(eq(offers.advertiserId, advertiserId))

        const offersToUpdate = advertiserOffers.filter(offer => {
            const offerGuidelines = offer.brandGuidelines as { type?: string; url?: string; text?: string } | null;
            if (!offerGuidelines || !offerGuidelines.type) {
                return true;
            }
            if (oldBrandGuidelines && typeof oldBrandGuidelines === "object" && oldBrandGuidelines !== null && "type" in oldBrandGuidelines) {
                const oldAdvertiserGuidelines = oldBrandGuidelines as { type?: string; url?: string; text?: string };
                return (
                    offerGuidelines.type === oldAdvertiserGuidelines.type &&
                    offerGuidelines.url === oldAdvertiserGuidelines.url &&
                    offerGuidelines.text === oldAdvertiserGuidelines.text
                );
            }
            return false;
        });

        if (offersToUpdate.length > 0) {
            const offerIds = offersToUpdate.map(o => o.id);
            await db.update(offers)
                .set({
                    brandGuidelines: brandGuidelinesData as { type: "url" | "file" | "text"; url?: string; fileUrl?: string; fileName?: string; fileSize?: number; mimeType?: string; text?: string; notes?: string; fileId?: string; attachedAt?: string; attachedBy?: string } | null,
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(offers.advertiserId, advertiserId),
                        inArray(offers.id, offerIds)
                    )
                )
        }
        return;
    }

    const advertiserOffers = await db
        .select({ 
            id: offers.id, 
            advertiserId: offers.advertiserId, 
            everflowAdvertiserId: offers.everflowAdvertiserId,
            brandGuidelines: offers.brandGuidelines
        })
        .from(offers)
        .where(
            or(
                eq(offers.everflowAdvertiserId, advertiserEverflowId),
                eq(offers.advertiserId, advertiserEverflowId),
                eq(offers.advertiserId, advertiserId)
            )
        )

    const offersToUpdate = advertiserOffers.filter(offer => {
        const offerGuidelines = offer.brandGuidelines as { type?: string; url?: string; text?: string } | null;
        if (!offerGuidelines || !offerGuidelines.type) {
            return true;
        }
        if (oldBrandGuidelines && typeof oldBrandGuidelines === "object" && oldBrandGuidelines !== null && "type" in oldBrandGuidelines) {
            const oldAdvertiserGuidelines = oldBrandGuidelines as { type?: string; url?: string; text?: string };
            return (
                offerGuidelines.type === oldAdvertiserGuidelines.type &&
                offerGuidelines.url === oldAdvertiserGuidelines.url &&
                offerGuidelines.text === oldAdvertiserGuidelines.text
            );
        }
        return false;
    });

    if (offersToUpdate.length > 0) {
        const offerIds = offersToUpdate.map(o => o.id);
        await db.update(offers)
            .set({
                brandGuidelines: brandGuidelinesData as { type: "url" | "file" | "text"; url?: string; fileUrl?: string; fileName?: string; fileSize?: number; mimeType?: string; text?: string; notes?: string; fileId?: string; attachedAt?: string; attachedBy?: string } | null,
                updatedAt: new Date(),
            })
            .where(
                and(
                    or(
                        eq(offers.everflowAdvertiserId, advertiserEverflowId),
                        eq(offers.advertiserId, advertiserEverflowId),
                        eq(offers.advertiserId, advertiserId)
                    ),
                    inArray(offers.id, offerIds)
                )
            )
    }
}

export async function detachAdvertiserBrandGuidelines(advertiserId: string) {
    const [advertiser] = await db.select().from(advertisers).where(eq(advertisers.id, advertiserId))
    if (!advertiser) throw new Error("Advertiser not found")

    await db.update(advertisers)
        .set({
            brandGuidelines: null,
            updatedAt: new Date(),
        })
        .where(eq(advertisers.id, advertiserId))

    const advertiserOffers = await db
        .select({ id: offers.id })
        .from(offers)
        .where(eq(offers.advertiserId, advertiserId))

    if (advertiserOffers.length > 0) {
        await db.update(offers)
            .set({
                brandGuidelines: null,
                updatedAt: new Date(),
            })
            .where(eq(offers.advertiserId, advertiserId))
    }
}

export async function getAdvertiserBrandGuidelines(advertiserId: string) {
    const [advertiser] = await db.select().from(advertisers).where(eq(advertisers.id, advertiserId))
    if (!advertiser) return null

    return advertiser.brandGuidelines || null
}

export async function getOfferBrandGuidelines(offerId: string) {
    const [offer] = await db.select().from(offers).where(eq(offers.id, offerId))
    if (!offer) {
        throw new Error("Offer not found")
    }

    if (offer.brandGuidelines) {
        const guidelines = offer.brandGuidelines as { type?: string; fileId?: string; url?: string; text?: string } | null;
        if (guidelines.type) {
            return guidelines;
        }
    }

    let advertiser = null;
    
    if (offer.everflowAdvertiserId) {
        const advertiserList = await db
            .select()
            .from(advertisers)
            .where(eq(advertisers.everflowAdvertiserId, offer.everflowAdvertiserId))
        
        advertiser = advertiserList[0] || null;
    }
    
    if (!advertiser && offer.advertiserId) {
        const advertiserList = await db
            .select()
            .from(advertisers)
            .where(eq(advertisers.everflowAdvertiserId, offer.advertiserId))
        
        advertiser = advertiserList[0] || null;
    }

    if (advertiser) {
        return advertiser.brandGuidelines || null;
    }

    return null;
}
