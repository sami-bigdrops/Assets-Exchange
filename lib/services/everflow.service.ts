import "server-only";

import { env } from "@/env";
import { logger } from "@/lib/logger";

interface EverflowConfig {
  apiKey: string;
  baseUrl: string;
  region?: string;
  networkId?: string;
}

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
}

interface ApiResponse<T = unknown> {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

class EverflowService {
  private config: EverflowConfig;
  private defaultRetryOptions: RetryOptions = {
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true,
  };

  constructor(config?: Partial<EverflowConfig>) {
    const region = config?.region || env.EVERFLOW_API_REGION || "api.eflow.team";
    const defaultBaseUrl = `https://${region}/v1`;
    
    this.config = {
      apiKey: config?.apiKey || env.EVERFLOW_API_KEY || "",
      baseUrl: config?.baseUrl || env.EVERFLOW_API_BASE_URL || defaultBaseUrl,
      region: config?.region || env.EVERFLOW_API_REGION || region,
      networkId: config?.networkId || env.EVERFLOW_NETWORK_ID,
    };

    if (!this.config.apiKey) {
      logger.everflow.warn("Everflow API key not configured");
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async request<T = unknown>(
    endpoint: string,
    options: RequestInit = {},
    retryOptions?: RetryOptions
  ): Promise<T> {
    const retry = { ...this.defaultRetryOptions, ...retryOptions };
    const url = `${this.config.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Eflow-API-Key": this.config.apiKey,
      ...(options.headers as Record<string, string>),
    };

    if (this.config.networkId) {
      headers["X-Eflow-Network-Id"] = this.config.networkId;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= (retry.maxRetries || 0); attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers,
        });

        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After");
          const delay = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : retry.retryDelay! * Math.pow(2, attempt);

          if (attempt < (retry.maxRetries || 0)) {
            logger.everflow.warn(`Rate limited, retrying after ${delay}ms - endpoint: ${endpoint}, attempt: ${attempt + 1}`);
            await this.sleep(delay);
            continue;
          }
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `API request failed: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        return data as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < (retry.maxRetries || 0)) {
          const delay = retry.exponentialBackoff
            ? retry.retryDelay! * Math.pow(2, attempt)
            : retry.retryDelay!;

          logger.everflow.warn(`Request failed, retrying - endpoint: ${endpoint}, attempt: ${attempt + 1}, error: ${lastError.message}`);

          await this.sleep(delay);
          continue;
        }
      }
    }

    logger.everflow.error(`Everflow API request failed after retries - endpoint: ${endpoint}, error: ${lastError?.message}`);

    throw lastError || new Error("Request failed");
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.config.apiKey) {
        logger.everflow.warn("Cannot test connection: API key not configured");
        return false;
      }

      const endpoints = ["/networks/offers?limit=1", "/networks/affiliates?limit=1"];
      let lastError: Error | null = null;

      for (const endpoint of endpoints) {
        try {
          const url = `${this.config.baseUrl}${endpoint}`;
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "X-Eflow-API-Key": this.config.apiKey,
          };

          if (this.config.networkId) {
            headers["X-Eflow-Network-Id"] = this.config.networkId;
          }

          logger.everflow.info(`Testing connection - url: ${url}, endpoint: ${endpoint}, hasApiKey: ${!!this.config.apiKey}, hasNetworkId: ${!!this.config.networkId}`);

          const response = await fetch(url, {
            method: "GET",
            headers,
          });

          if (!response.ok) {
            const errorText = await response.text();
            let errorData: { message?: string; error?: string } = {};
            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = { message: errorText || response.statusText };
            }

            const errorMsg = errorData.message || errorData.error || `HTTP ${response.status}`;
            
            logger.everflow.warn(`Connection test failed for ${endpoint} - status: ${response.status}, statusText: ${response.statusText}, error: ${errorMsg}, url: ${url}`);

            lastError = new Error(errorMsg);
            continue;
          }

          let data: unknown;
          const contentType = response.headers.get("content-type");
          
          if (contentType && contentType.includes("application/json")) {
            try {
              data = await response.json();
            } catch {
              data = null;
            }
          } else {
            const text = await response.text();
            data = text || null;
          }

          logger.everflow.success(`Everflow connection test passed - endpoint: ${endpoint}, status: ${response.status}, data: ${data || "Empty response"}`);
          return true;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          logger.everflow.warn(`Connection test error for ${endpoint} - error: ${lastError.message}`);
          continue;
        }
      }

      throw lastError || new Error("All connection test endpoints failed");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.everflow.error(`Everflow connection test failed - error: ${errorMessage}, baseUrl: ${this.config.baseUrl}, hasApiKey: ${!!this.config.apiKey}, hasNetworkId: ${!!this.config.networkId}`);
      return false;
    }
  }

  async getOffers(params?: {
    page?: number;
    limit?: number;
    advertiserId?: string;
    status?: string;
  }): Promise<ApiResponse<{ offers: unknown[]; total: number }>> {
    const queryParams = new URLSearchParams();
    queryParams.append("page", String(params?.page || 1));
    queryParams.append("page_size", String(params?.limit || 100));

    const endpoint = `/networks/offerstable?${queryParams.toString()}`;
    
    const filters: Record<string, unknown> = {};
    if (params?.status) filters.offer_status = params.status;
    if (params?.advertiserId) filters.network_advertiser_id = params.advertiserId;
    
    const body: Record<string, unknown> = {};
    if (Object.keys(filters).length > 0) body.filters = filters;

    logger.everflow.info(`Fetching offers from Everflow - endpoint: ${endpoint}, page: ${params?.page || 1}, pageSize: ${params?.limit || 100}, filters: ${JSON.stringify(filters)}`);

    return this.request<ApiResponse<{ offers: unknown[]; total: number }>>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async getAdvertisers(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ApiResponse<{ advertisers: unknown[]; total: number }>> {
    const queryParams = new URLSearchParams();
    queryParams.append("page", String(params?.page || 1));
    queryParams.append("page_size", String(params?.limit || 100));

    const endpoint = `/networks/advertiserstable?${queryParams.toString()}`;
    
    const filters: Record<string, unknown> = {};
    if (params?.status) filters.advertiser_status = params.status;
    
    const body: Record<string, unknown> = {};
    if (Object.keys(filters).length > 0) body.filters = filters;

    logger.everflow.info(`Fetching advertisers from Everflow - endpoint: ${endpoint}, page: ${params?.page || 1}, pageSize: ${params?.limit || 100}, filters: ${JSON.stringify(filters)}`);

    return this.request<ApiResponse<{ advertisers: unknown[]; total: number }>>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  updateConfig(config: Partial<EverflowConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): EverflowConfig {
    return { ...this.config };
  }
}

let everflowServiceInstance: EverflowService | null = null;

export function getEverflowService(config?: Partial<EverflowConfig>): EverflowService {
  if (!everflowServiceInstance || config) {
    everflowServiceInstance = new EverflowService(config);
  } else if (everflowServiceInstance && !everflowServiceInstance.getConfig().apiKey && env.EVERFLOW_API_KEY) {
    const region = env.EVERFLOW_API_REGION || "api.eflow.team";
    const defaultBaseUrl = `https://${region}/v1`;
    everflowServiceInstance.updateConfig({
      apiKey: env.EVERFLOW_API_KEY,
      baseUrl: env.EVERFLOW_API_BASE_URL || defaultBaseUrl,
      region: env.EVERFLOW_API_REGION || region,
      networkId: env.EVERFLOW_NETWORK_ID,
    });
  }
  return everflowServiceInstance;
}

export { EverflowService };
export type { EverflowConfig, ApiResponse };

