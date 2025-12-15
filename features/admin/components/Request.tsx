"use client";

import { publisherRequests, advertiserResponse } from "../models/request.model";

import { RequestSection } from "./RequestSection";

export function Request() {
  const incomingPublisherRequest = publisherRequests.find(
    (req) => req.headerTitle === "Incoming Publisher Requests"
  );

  const incomingAdvertiserRequest = advertiserResponse.find(
    (req) => req.headerTitle === "Incoming Advertiser Response"
  );

  if (!incomingPublisherRequest && !incomingAdvertiserRequest) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">No data available</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {incomingPublisherRequest && (
        <RequestSection request={incomingPublisherRequest} />
      )}
      {incomingAdvertiserRequest && (
        <RequestSection request={incomingAdvertiserRequest} />
      )}
    </div>
  );
}
