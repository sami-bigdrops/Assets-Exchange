import { describe, it, expect } from "vitest";

describe("GET /api/admin/audit-logs", () => {
    describe("Phase 7 - Testing Strategy", () => {
        describe("1️⃣ No Filters", () => {
            it("should return latest logs when no filters provided", async () => {
                const response = await fetch("/api/admin/audit-logs", {
                    headers: {
                        "Cookie": "auth-token=valid-admin-session",
                    },
                });

                expect(response.status).toBe(200);
                const data = await response.json();

                expect(data).toHaveProperty("data");
                expect(data).toHaveProperty("meta");
                expect(Array.isArray(data.data)).toBe(true);
                expect(data.meta).toMatchObject({
                    page: expect.any(Number),
                    limit: expect.any(Number),
                    total: expect.any(Number),
                    totalPages: expect.any(Number),
                });

                if (data.data.length > 0) {
                    const firstLog = data.data[0];
                    expect(firstLog).toHaveProperty("id");
                    expect(firstLog).toHaveProperty("adminId");
                    expect(firstLog).toHaveProperty("actionType");
                    expect(firstLog).toHaveProperty("createdAt");
                }
            });

            it("should support pagination", async () => {
                const page1 = await fetch("/api/admin/audit-logs?page=1&limit=10", {
                    headers: {
                        "Cookie": "auth-token=valid-admin-session",
                    },
                });
                const data1 = await page1.json();

                const page2 = await fetch("/api/admin/audit-logs?page=2&limit=10", {
                    headers: {
                        "Cookie": "auth-token=valid-admin-session",
                    },
                });
                const data2 = await page2.json();

                expect(data1.meta.page).toBe(1);
                expect(data2.meta.page).toBe(2);
                expect(data1.data.length).toBeLessThanOrEqual(10);
                expect(data2.data.length).toBeLessThanOrEqual(10);

                if (data1.meta.total > 10) {
                    expect(data1.data).not.toEqual(data2.data);
                }
            });

            it("should sort by createdAt DESC (latest first)", async () => {
                const response = await fetch("/api/admin/audit-logs?limit=10", {
                    headers: {
                        "Cookie": "auth-token=valid-admin-session",
                    },
                });
                const data = await response.json();

                if (data.data.length > 1) {
                    for (let i = 0; i < data.data.length - 1; i++) {
                        const current = new Date(data.data[i].createdAt);
                        const next = new Date(data.data[i + 1].createdAt);
                        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
                    }
                }
            });
        });

        describe("2️⃣ Single Filters", () => {
            it("should filter by adminId only", async () => {
                const adminId = "test-admin-id-123";
                const response = await fetch(`/api/admin/audit-logs?adminId=${adminId}`, {
                    headers: {
                        "Cookie": "auth-token=valid-admin-session",
                    },
                });

                expect(response.status).toBe(200);
                const data = await response.json();

                data.data.forEach((log: { adminId: string }) => {
                    expect(log.adminId).toBe(adminId);
                });
            });

            it("should filter by actionType=APPROVE only", async () => {
                const response = await fetch("/api/admin/audit-logs?actionType=APPROVE", {
                    headers: {
                        "Cookie": "auth-token=valid-admin-session",
                    },
                });

                expect(response.status).toBe(200);
                const data = await response.json();

                data.data.forEach((log: { actionType: string }) => {
                    expect(log.actionType).toBe("APPROVE");
                });
            });

            it("should filter by actionType=REJECT only", async () => {
                const response = await fetch("/api/admin/audit-logs?actionType=REJECT", {
                    headers: {
                        "Cookie": "auth-token=valid-admin-session",
                    },
                });

                expect(response.status).toBe(200);
                const data = await response.json();

                data.data.forEach((log: { actionType: string }) => {
                    expect(log.actionType).toBe("REJECT");
                });
            });

            it("should filter by startDate only", async () => {
                const startDate = "2024-01-01";
                const response = await fetch(`/api/admin/audit-logs?startDate=${startDate}`, {
                    headers: {
                        "Cookie": "auth-token=valid-admin-session",
                    },
                });

                expect(response.status).toBe(200);
                const data = await response.json();

                data.data.forEach((log: { createdAt: string }) => {
                    const logDate = new Date(log.createdAt);
                    const start = new Date(startDate);
                    start.setHours(0, 0, 0, 0);
                    expect(logDate.getTime()).toBeGreaterThanOrEqual(start.getTime());
                });
            });

            it("should filter by endDate only", async () => {
                const endDate = "2024-12-31";
                const response = await fetch(`/api/admin/audit-logs?endDate=${endDate}`, {
                    headers: {
                        "Cookie": "auth-token=valid-admin-session",
                    },
                });

                expect(response.status).toBe(200);
                const data = await response.json();

                data.data.forEach((log: { createdAt: string }) => {
                    const logDate = new Date(log.createdAt);
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    expect(logDate.getTime()).toBeLessThanOrEqual(end.getTime());
                });
            });

            it("should filter by date range (startDate + endDate)", async () => {
                const startDate = "2024-01-01";
                const endDate = "2024-01-31";
                const response = await fetch(
                    `/api/admin/audit-logs?startDate=${startDate}&endDate=${endDate}`,
                    {
                        headers: {
                            "Cookie": "auth-token=valid-admin-session",
                        },
                    }
                );

                expect(response.status).toBe(200);
                const data = await response.json();

                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);

                data.data.forEach((log: { createdAt: string }) => {
                    const logDate = new Date(log.createdAt);
                    expect(logDate.getTime()).toBeGreaterThanOrEqual(start.getTime());
                    expect(logDate.getTime()).toBeLessThanOrEqual(end.getTime());
                });
            });
        });

        describe("3️⃣ Combined Filters", () => {
            it("should filter by adminId + actionType", async () => {
                const adminId = "test-admin-id-123";
                const response = await fetch(
                    `/api/admin/audit-logs?adminId=${adminId}&actionType=APPROVE`,
                    {
                        headers: {
                            "Cookie": "auth-token=valid-admin-session",
                        },
                    }
                );

                expect(response.status).toBe(200);
                const data = await response.json();

                data.data.forEach((log: { adminId: string; actionType: string }) => {
                    expect(log.adminId).toBe(adminId);
                    expect(log.actionType).toBe("APPROVE");
                });
            });

            it("should filter by actionType + date range", async () => {
                const startDate = "2024-01-01";
                const endDate = "2024-01-31";
                const response = await fetch(
                    `/api/admin/audit-logs?actionType=REJECT&startDate=${startDate}&endDate=${endDate}`,
                    {
                        headers: {
                            "Cookie": "auth-token=valid-admin-session",
                        },
                    }
                );

                expect(response.status).toBe(200);
                const data = await response.json();

                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);

                data.data.forEach((log: { actionType: string; createdAt: string }) => {
                    expect(log.actionType).toBe("REJECT");
                    const logDate = new Date(log.createdAt);
                    expect(logDate.getTime()).toBeGreaterThanOrEqual(start.getTime());
                    expect(logDate.getTime()).toBeLessThanOrEqual(end.getTime());
                });
            });

            it("should filter by all three filters together", async () => {
                const adminId = "test-admin-id-123";
                const startDate = "2024-01-01";
                const endDate = "2024-01-31";
                const response = await fetch(
                    `/api/admin/audit-logs?adminId=${adminId}&actionType=APPROVE&startDate=${startDate}&endDate=${endDate}`,
                    {
                        headers: {
                            "Cookie": "auth-token=valid-admin-session",
                        },
                    }
                );

                expect(response.status).toBe(200);
                const data = await response.json();

                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);

                data.data.forEach((log: {
                    adminId: string;
                    actionType: string;
                    createdAt: string;
                }) => {
                    expect(log.adminId).toBe(adminId);
                    expect(log.actionType).toBe("APPROVE");
                    const logDate = new Date(log.createdAt);
                    expect(logDate.getTime()).toBeGreaterThanOrEqual(start.getTime());
                    expect(logDate.getTime()).toBeLessThanOrEqual(end.getTime());
                });
            });
        });

        describe("4️⃣ Invalid Inputs", () => {
            it("should reject invalid actionType", async () => {
                const response = await fetch("/api/admin/audit-logs?actionType=INVALID", {
                    headers: {
                        "Cookie": "auth-token=valid-admin-session",
                    },
                });

                expect(response.status).toBe(400);
                const data = await response.json();
                expect(data).toHaveProperty("error");
                expect(data.error).toContain("actionType");
            });

            it("should reject invalid date format", async () => {
                const response = await fetch("/api/admin/audit-logs?startDate=invalid-date", {
                    headers: {
                        "Cookie": "auth-token=valid-admin-session",
                    },
                });

                expect(response.status).toBe(400);
                const data = await response.json();
                expect(data).toHaveProperty("error");
                expect(data.error).toContain("date");
            });

            it("should reject when startDate > endDate", async () => {
                const response = await fetch(
                    "/api/admin/audit-logs?startDate=2024-12-31&endDate=2024-01-01",
                    {
                        headers: {
                            "Cookie": "auth-token=valid-admin-session",
                        },
                    }
                );

                expect(response.status).toBe(400);
                const data = await response.json();
                expect(data).toHaveProperty("error");
                expect(data.error).toContain("startDate");
            });

            it("should reject invalid page number", async () => {
                const response = await fetch("/api/admin/audit-logs?page=0", {
                    headers: {
                        "Cookie": "auth-token=valid-admin-session",
                    },
                });

                expect(response.status).toBe(400);
                const data = await response.json();
                expect(data).toHaveProperty("error");
            });

            it("should reject invalid limit (too high)", async () => {
                const response = await fetch("/api/admin/audit-logs?limit=200", {
                    headers: {
                        "Cookie": "auth-token=valid-admin-session",
                    },
                });

                expect(response.status).toBe(400);
                const data = await response.json();
                expect(data).toHaveProperty("error");
            });

            it("should reject invalid limit (too low)", async () => {
                const response = await fetch("/api/admin/audit-logs?limit=0", {
                    headers: {
                        "Cookie": "auth-token=valid-admin-session",
                    },
                });

                expect(response.status).toBe(400);
                const data = await response.json();
                expect(data).toHaveProperty("error");
            });
        });

        describe("5️⃣ Auth Tests", () => {
            it("should deny access to non-admin user", async () => {
                const response = await fetch("/api/admin/audit-logs", {
                    headers: {
                        "Cookie": "auth-token=advertiser-session",
                    },
                });

                expect(response.status).toBe(401);
                const data = await response.json();
                expect(data).toHaveProperty("error");
                expect(data.error).toBe("Unauthorized");
            });

            it("should deny access to unauthenticated user", async () => {
                const response = await fetch("/api/admin/audit-logs");

                expect(response.status).toBe(401);
                const data = await response.json();
                expect(data).toHaveProperty("error");
                expect(data.error).toBe("Unauthorized");
            });

            it("should allow access to admin user", async () => {
                const response = await fetch("/api/admin/audit-logs", {
                    headers: {
                        "Cookie": "auth-token=valid-admin-session",
                    },
                });

                expect(response.status).toBe(200);
            });

            it("should allow access to administrator user", async () => {
                const response = await fetch("/api/admin/audit-logs", {
                    headers: {
                        "Cookie": "auth-token=valid-administrator-session",
                    },
                });

                expect(response.status).toBe(200);
            });
        });

        describe("Response Shape Validation", () => {
            it("should return correct response structure", async () => {
                const response = await fetch("/api/admin/audit-logs", {
                    headers: {
                        "Cookie": "auth-token=valid-admin-session",
                    },
                });

                expect(response.status).toBe(200);
                const data = await response.json();

                expect(data).toHaveProperty("data");
                expect(data).toHaveProperty("meta");
                expect(Array.isArray(data.data)).toBe(true);

                expect(data.meta).toMatchObject({
                    page: expect.any(Number),
                    limit: expect.any(Number),
                    total: expect.any(Number),
                    totalPages: expect.any(Number),
                });

                if (data.data.length > 0) {
                    const log = data.data[0];
                    expect(log).toHaveProperty("id");
                    expect(log).toHaveProperty("adminId");
                    expect(log).toHaveProperty("actionType");
                    expect(log).toHaveProperty("createdAt");
                    expect(log).toHaveProperty("entityType");
                    expect(log).toHaveProperty("entityId");
                    expect(log).toHaveProperty("details");
                    expect(log).toHaveProperty("ipAddress");
                    expect(log).toHaveProperty("userAgent");

                    expect(typeof log.id).toBe("string");
                    expect(typeof log.adminId).toBe("string");
                    expect(["APPROVE", "REJECT"]).toContain(log.actionType);
                    expect(typeof log.createdAt).toBe("string");
                }
            });

            it("should return empty array when no logs match filters", async () => {
                const response = await fetch(
                    "/api/admin/audit-logs?adminId=non-existent-admin-id",
                    {
                        headers: {
                            "Cookie": "auth-token=valid-admin-session",
                        },
                    }
                );

                expect(response.status).toBe(200);
                const data = await response.json();

                expect(data.data).toEqual([]);
                expect(data.meta.total).toBe(0);
                expect(data.meta.totalPages).toBe(0);
            });
        });
    });
});
