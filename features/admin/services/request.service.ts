import { advertiserResponse, publisherRequests } from "../models/request.model";
import type { Request } from "../types/admin.types";

export async function getRequests(): Promise<Request[]> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return [...publisherRequests, ...advertiserResponse];
}
