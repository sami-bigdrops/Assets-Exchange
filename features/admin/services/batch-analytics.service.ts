export interface BatchPerformanceMetrics {
  batchId: string;
  batchLabel: string;
  totalImpressions: number;
  totalClicks: number;
  ctr: number;
}

export interface BatchAnalyticsResponse {
  batches: BatchPerformanceMetrics[];
  summary: {
    totalBatches: number;
    totalImpressions: number;
    totalClicks: number;
    averageCtr: number;
  };
}

export async function getBatchPerformance(
  _batchId: string
): Promise<BatchPerformanceMetrics | null> {
  // Stubs for reverted analytics
  return {
    batchId: "unknown",
    batchLabel: "Unknown",
    totalImpressions: 0,
    totalClicks: 0,
    ctr: 0,
  };
}

export async function getBatchesPerformance(
  _batchIds: string[]
): Promise<BatchAnalyticsResponse> {
  // Stubs for reverted analytics
  return {
    batches: [],
    summary: {
      totalBatches: 0,
      totalImpressions: 0,
      totalClicks: 0,
      averageCtr: 0,
    },
  };
}

export async function getAllActiveBatchesPerformance(): Promise<BatchAnalyticsResponse> {
  // Stubs for reverted analytics
  return {
    batches: [],
    summary: {
      totalBatches: 0,
      totalImpressions: 0,
      totalClicks: 0,
      averageCtr: 0,
    },
  };
}
