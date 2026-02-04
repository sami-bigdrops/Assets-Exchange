export type WorkflowEvent = {
  event:
    | "request.approved_by_admin"
    | "request.forwarded_to_advertiser"
    | "request.rejected_by_admin"
    | "request.sent_back_by_admin"
    | "response.approved_by_advertiser"
    | "response.sent_back_by_advertiser";
  requestId: string;
  offerName: string;
  fromStatus: string;
  toStatus: string;
  actor: {
    role: "admin" | "advertiser";
    id: string;
  };
  timestamp: string;
};
