export type BatchStatus = "active" | "inactive" | "archived";

export interface Batch {
  id: string;
  batchLabel: string;
  description: string | null;
  status: BatchStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  assetCount?: number;
}

export interface BatchWithAssets extends Batch {
  assets: Array<{
    id: string;
    publisherId: string;
    status: string;
    createdAt: string;
    approvedAt: string | null;
  }>;
}

export interface CreateBatchInput {
  batchLabel: string;
  description?: string;
  status?: BatchStatus;
  createdBy: string;
}

export interface UpdateBatchInput {
  batchLabel?: string;
  description?: string;
  status?: BatchStatus;
}

export interface ListBatchesFilters {
  search?: string;
  status?: BatchStatus;
  createdBy?: string;
}
