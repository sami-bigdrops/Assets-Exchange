export type Publisher = {
    id: string
    name: string
    publisherName: string // Alias for compatibility
    platform: string
    createdMethod: "API" | "Manually"
    contactEmail?: string | null
    status: "active" | "inactive" | "Active" | "Inactive"
    createdAt: string
    updatedAt: string
}

export type PublishersResponse = {
    data: Publisher[]
    total: number
    page: number
    limit: number
    totalPages: number
}
