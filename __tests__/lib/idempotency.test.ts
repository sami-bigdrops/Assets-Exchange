/**
 * @jest-environment node
 */
import { checkIdempotency, storeIdempotencyResponse } from "@/lib/idempotency";
import { db } from "@/lib/db";
import { idempotencyKeys } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";

// Mock external dependencies
jest.mock("@paralleldrive/cuid2", () => ({
  createId: () => "mock-id",
}));

// Mock the db module
jest.mock("@/lib/db", () => ({
  db: {
    query: {
      idempotencyKeys: {
        findFirst: jest.fn(),
      },
    },
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        onConflictDoUpdate: jest.fn(),
      })),
    })),
  },
}));

describe("Idempotency Library", () => {
  const mockKey = "test-key-123";
  const mockUrl = "http://localhost/api/test";
  const mockMethod = "POST";
  const mockBody = JSON.stringify({ foo: "bar" });

  // Calculate expected hash for consistency in tests
  const expectedHashInput = `${mockMethod}:${mockUrl}:${mockBody}`;
  const expectedHash = createHash("sha256").update(expectedHashInput).digest("hex");

  // Helper to create a fresh request object
  const createRequest = () => {
    return new Request(mockUrl, {
      method: mockMethod,
      body: mockBody,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("checkIdempotency", () => {
    it("should return 'miss' if the key does not exist", async () => {
      (db.query.idempotencyKeys.findFirst as jest.Mock).mockResolvedValue(undefined);

      const request = createRequest();
      const result = await checkIdempotency(mockKey, request);

      expect(result).toEqual({ status: "miss" });
      expect(db.query.idempotencyKeys.findFirst).toHaveBeenCalledWith({
        where: eq(idempotencyKeys.id, mockKey),
      });
    });

    it("should return 'conflict' if the request hash does not match", async () => {
      (db.query.idempotencyKeys.findFirst as jest.Mock).mockResolvedValue({
        id: mockKey,
        requestHash: "different-hash",
        expiresAt: new Date(Date.now() + 10000), // Future date
      });

      const request = createRequest();
      const result = await checkIdempotency(mockKey, request);

      expect(result).toEqual({ status: "conflict" });
    });

    it("should return 'miss' if the key exists but has expired", async () => {
      (db.query.idempotencyKeys.findFirst as jest.Mock).mockResolvedValue({
        id: mockKey,
        requestHash: expectedHash,
        expiresAt: new Date(Date.now() - 10000), // Past date
      });

      const request = createRequest();
      const result = await checkIdempotency(mockKey, request);

      expect(result).toEqual({ status: "miss" });
    });

    it("should return 'hit' with response if the key exists, matches hash, and is valid", async () => {
      const mockResponse = {
        status: 201,
        body: { success: true },
      };

      (db.query.idempotencyKeys.findFirst as jest.Mock).mockResolvedValue({
        id: mockKey,
        requestHash: expectedHash,
        expiresAt: new Date(Date.now() + 10000), // Future date
        responseStatus: mockResponse.status,
        responseBody: mockResponse.body,
      });

      const request = createRequest();
      const result = await checkIdempotency(mockKey, request);

      expect(result).toEqual({
        status: "hit",
        response: {
          status: mockResponse.status,
          body: mockResponse.body,
        },
      });
    });

    it("should return 'hit' with default status 200 if responseStatus is missing", async () => {
       const mockResponseBody = { success: true };

       (db.query.idempotencyKeys.findFirst as jest.Mock).mockResolvedValue({
         id: mockKey,
         requestHash: expectedHash,
         expiresAt: new Date(Date.now() + 10000), // Future date
         responseStatus: null, // Simulate missing status
         responseBody: mockResponseBody,
       });

       const request = createRequest();
       const result = await checkIdempotency(mockKey, request);

       expect(result).toEqual({
         status: "hit",
         response: {
           status: 200,
           body: mockResponseBody,
         },
       });
     });
  });

  describe("storeIdempotencyResponse", () => {
    it("should insert or update the idempotency key record", async () => {
      const mockResponseStatus = 201;
      const mockResponseBody = { created: true };
      const request = createRequest();

      // Setup the mock chain
      const onConflictDoUpdateMock = jest.fn().mockResolvedValue(undefined);
      const valuesMock = jest.fn(() => ({ onConflictDoUpdate: onConflictDoUpdateMock }));
      (db.insert as jest.Mock).mockReturnValue({ values: valuesMock });

      await storeIdempotencyResponse(mockKey, request, mockResponseStatus, mockResponseBody);

      expect(db.insert).toHaveBeenCalledWith(idempotencyKeys);

      // Verify values call
      const valuesCall = valuesMock.mock.calls[0][0];
      expect(valuesCall).toMatchObject({
        id: mockKey,
        requestHash: expectedHash,
        responseStatus: mockResponseStatus,
        responseBody: mockResponseBody,
      });
      expect(valuesCall.expiresAt).toBeInstanceOf(Date);

      // Verify onConflictDoUpdate call
      expect(onConflictDoUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
        target: idempotencyKeys.id,
        set: expect.objectContaining({
            requestHash: expectedHash,
            responseStatus: mockResponseStatus,
            responseBody: mockResponseBody,
            createdAt: expect.any(Date),
        })
      }));
    });
  });
});
