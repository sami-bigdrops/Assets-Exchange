
export type RequestStatus =
    | "new"
    | "pending"
    | "approved"
    | "rejected"
    | "sent-back";


export type ApprovalStage = "admin" | "advertiser" | "completed";


export interface CreativeRequest {
    id: string;
    date: string;
    offerId: string;
    offerName: string;
    creativeType: string;
    creativeCount: number;
    fromLinesCount: number;
    subjectLinesCount: number;
    advertiserName: string;
    affiliateId: string;
    clientId: string;
    clientName: string;
    priority: string;
    status: RequestStatus;
    approvalStage: ApprovalStage;

    parentRequestId?: string;
    childResponseId?: string; 
}

export type RequestListResponse = {
    data: CreativeRequest[]
    meta: {
        page: number
        limit: number
        total: number
    }
}
