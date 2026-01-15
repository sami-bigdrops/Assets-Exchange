export type Publisher = {
    id: string
    name: string
    publisherName: string // Alias for compatibility
    pubPlatform: string
    createdMethod: "API" | "Manually"
    contactEmail?: string | null
    status: "active" | "inactive" | "Active" | "Inactive"
    createdAt: string
    updatedAt: string
}
