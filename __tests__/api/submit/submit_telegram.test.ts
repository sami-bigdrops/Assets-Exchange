/// <reference types="next" />
import { describe, it, expect, beforeEach, vi } from "vitest";

import { POST } from "@/app/api/submit/route";
import { getOffer } from "@/features/admin/services/offer.service";
import { sendSubmissionTelegramAlert } from "@/features/notifications/notification.service";
import { validateRequest } from "@/lib/middleware/validateRequest";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    returning: vi.fn().mockResolvedValue([{ id: "req_123" } as any]),
  },
}));

vi.mock("@/features/admin/services/offer.service", () => ({
  getOffer: vi.fn(),
}));

vi.mock("@/lib/middleware/validateRequest", () => ({
  validateRequest: vi.fn(),
}));

vi.mock("@/features/notifications/notification.service", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendSubmissionTelegramAlert: vi.fn().mockResolvedValue(undefined as any),
}));

vi.mock("@/lib/utils/tracking", () => ({
  generateTrackingCode: vi.fn().mockReturnValue("TRACK-TEST-123"),
}));

vi.mock("@/lib/schema", () => ({
  creativeRequests: { id: "req_123" },
  assetsTable: {},
  creatives: {},
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    app: {
      info: vi.fn(),
      error: vi.fn(),
    },
  },
}));

describe("POST /api/submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 201 and trigger Telegram alert on valid submission with telegramId", async () => {
    // Setup mocks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (validateRequest as any).mockResolvedValue({
      data: {
        offerId: "offer_123",
        firstName: "John",
        lastName: "Doe",
        affiliateId: "aff_123",
        fromLines: "Line 1\nLine 2",
        subjectLines: "Subject 1",
        email: "john@example.com",
        telegramId: "123456789", // Valid numeric ID
        companyName: "Acme Corp",
        priority: "medium",
        creativeType: "image",
        files: [],
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getOffer as any).mockResolvedValue({
      offerName: "Test Campaign 2024",
      advertiserId: "adv_123",
      advName: "Advertiser Inc",
    });

    // Create mock request
    const req = {
      json: async () => ({}),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    try {
      // Execute
      const response = await POST(req);
      const json = await response.json();

      // Assertions
      expect(response.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.trackingCode).toBe("TRACK-TEST-123");

      // Verify Telegram Alert Call
      expect(sendSubmissionTelegramAlert).toHaveBeenCalledTimes(1);
      expect(sendSubmissionTelegramAlert).toHaveBeenCalledWith(
        "123456789",
        "TRACK-TEST-123",
        "Test Campaign 2024"
      );
    } catch (e) {
      throw e;
    }
  });

  it("should NOT trigger Telegram alert if telegramId is missing, but still return success", async () => {
    // Setup mocks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (validateRequest as any).mockResolvedValue({
      data: {
        offerId: "offer_123",
        firstName: "Jane",
        lastName: "Doe",
        affiliateId: "aff_456",
        fromLines: "",
        subjectLines: "",
        email: "jane@example.com",
        telegramId: null, // No ID
        companyName: "Beta Corp",
        creativeType: "html",
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getOffer as any).mockResolvedValue({
      offerName: "Campaign Beta",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const req = { json: async () => ({}) } as any;
    const response = await POST(req);
    const json = await response.json();

    // Verify successful response despite missing Telegram ID
    expect(response.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.requestId).toBe("req_123"); // From db mock

    // Verify Alert was skipped
    expect(sendSubmissionTelegramAlert).not.toHaveBeenCalled();
  });

  it("should return response immediately (under 200ms) even if Telegram API is slow (5s delay)", async () => {
    // Setup mocks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (validateRequest as any).mockResolvedValue({
      data: {
        offerId: "offer_123",
        firstName: "Async",
        lastName: "User",
        affiliateId: "aff_async",
        fromLines: "",
        subjectLines: "",
        email: "async@example.com",
        telegramId: "999999", // Valid ID to trigger alert
        companyName: "Async Corp",
        creativeType: "image",
        files: [],
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getOffer as any).mockResolvedValue({
      offerName: "Async Campaign",
    });

    // Mock sendSubmissionTelegramAlert to take 5 seconds
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sendSubmissionTelegramAlert as any).mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const req = { json: async () => ({}) } as any;

    const startTime = Date.now();
    const response = await POST(req);
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Expectations
    expect(response.status).toBe(201);
    expect(duration).toBeLessThan(200); // Should be very fast, proving it didn't wait 5s

    // Verify the alert was actually called (even if we didn't wait for it to finish in the main thread)
    expect(sendSubmissionTelegramAlert).toHaveBeenCalled();
  });

  it("should return 201 and log error if Telegram API fails (e.g. 401/500), without blocking user", async () => {
    // Setup mocks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (validateRequest as any).mockResolvedValue({
      data: {
        offerId: "offer_123",
        firstName: "Error",
        lastName: "User",
        affiliateId: "aff_error",
        fromLines: "",
        subjectLines: "",
        email: "error@example.com",
        telegramId: "12345",
        companyName: "Error Corp",
        creativeType: "image",
        files: [],
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getOffer as any).mockResolvedValue({
      offerName: "Error Campaign",
    });

    // Mock console.error to track it and suppress output during test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Mock sendSubmissionTelegramAlert to fail
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sendSubmissionTelegramAlert as any).mockRejectedValueOnce(
      new Error("Telegram 500 Error")
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const req = { json: async () => ({}) } as any;
    const response = await POST(req);
    const json = await response.json();

    // Verify user still gets success
    expect(response.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.trackingCode).toBe("TRACK-TEST-123");

    // Wait a tick for the async catch block to execute
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(consoleSpy).toHaveBeenCalledWith(
      "[TELEGRAM_NOTIFY_ERROR]:",
      expect.objectContaining({ message: "Telegram 500 Error" })
    );

    consoleSpy.mockRestore();
  });
});
