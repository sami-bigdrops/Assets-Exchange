export type Offer = {
    id: string
    offerId: string // Display ID like O0001 or fallback to id
    name: string    // Maps to offerName
    offerName: string // Alias for compatibility
    advertiserId: string
    advName?: string  // For compatibility
    status: "active" | "inactive" | "Active" | "Inactive"
    visibility: "Public" | "Internal" | "Hidden"
    createdMethod: "API" | "Manually"
    brandGuidelinesFileId?: string | null
    createdAt: string
    updatedAt: string
}


