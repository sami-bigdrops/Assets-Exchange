export type Advertiser = {
    id: string
    advertiserId: string 
    name: string
    advertiserName: string 
    advPlatform: string
    createdMethod: "API" | "Manually"
    contactEmail?: string | null
    email?: string | null
    status: "Active" | "Inactive"
    everflowAdvertiserId?: string | null
    createdAt: string
    updatedAt: string
    createdBy?: string | null
    updatedBy?: string | null
    brandGuidelines?: {
        type: "url" | "file" | "text" | null;
        url?: string;
        fileUrl?: string;
        fileName?: string;
        fileSize?: number;
        mimeType?: string;
        text?: string;
        notes?: string;
        attachedAt?: string;
        attachedBy?: string;
    } | null;
}
