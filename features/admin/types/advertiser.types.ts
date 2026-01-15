export type Advertiser = {
    id: string
    advertiserId: string 
    name: string
    advertiserName: string 
    advPlatform: string
    createdMethod: "API" | "Manually"
    contactEmail?: string | null
    status: "active" | "inactive" | "Active" | "Inactive"
    everflowAdvertiserId?: string | null
    createdAt: string
    updatedAt: string
}
