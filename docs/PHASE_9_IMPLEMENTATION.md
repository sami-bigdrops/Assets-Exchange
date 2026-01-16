# Phase 9: Publisher Flow, Analytics & Ops Integration - Implementation Guide

**Status:** ⏳ Not Started  
**Priority:** 🔴 HIGH  
**Estimated Duration:** 6 weeks (5 sprints)

---

## Table of Contents

1. [Overview](#overview)
2. [Database Migrations](#database-migrations)
3. [Zod Schemas](#zod-schemas)
4. [API Endpoints](#api-endpoints)
5. [Service Layer](#service-layer)
6. [Grammar AI Integration](#grammar-ai-integration)
7. [Analytics Implementation](#analytics-implementation)
8. [Testing Plan](#testing-plan)

---

## Overview

Phase 9 transforms the publisher form into a complete backend workflow system. All external API calls are made by Admin backend only. The system maintains a single source of truth for submissions that flows through Publisher → Admin → Advertiser.

### Key Principles

- ✅ Admin-only external API calls
- ✅ Single immutable approval chain
- ✅ Operational analytics only (not business events)
- ✅ Tracking ID system for publisher visibility
- ✅ Grammar AI integration via Admin backend
- ✅ Ops dashboard for monitoring

---

## Database Migrations

### Migration 1: Publisher Submissions Core Tables

**File:** `drizzle/0008_publisher_submissions.sql`

```sql
-- Publisher submissions table
CREATE TABLE publisher_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id TEXT UNIQUE NOT NULL,
  affiliate_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  telegram_id TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_publisher_submissions_tracking_id ON publisher_submissions(tracking_id);
CREATE INDEX idx_publisher_submissions_status ON publisher_submissions(status);
CREATE INDEX idx_publisher_submissions_created_at ON publisher_submissions(created_at DESC);

-- Creatives table
CREATE TABLE creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES publisher_submissions(id) ON DELETE CASCADE,
  offer_id TEXT NOT NULL,
  creative_type TEXT NOT NULL,
  priority TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_creatives_submission_id ON creatives(submission_id);

-- Creative files table
CREATE TABLE creative_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id UUID NOT NULL REFERENCES creatives(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  size_bytes INTEGER,
  mime_type TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_creative_files_creative_id ON creative_files(creative_id);

-- Submission reviews table (tracks approval decisions)
CREATE TABLE submission_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES publisher_submissions(id) ON DELETE CASCADE,
  reviewer_role TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  decision TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_submission_reviews_submission_id ON submission_reviews(submission_id);
CREATE INDEX idx_submission_reviews_reviewer ON submission_reviews(reviewer_role, reviewer_id);
```

### Migration 2: External Tasks & Analytics

**File:** `drizzle/0009_external_tasks_analytics.sql`

```sql
-- External tasks table (grammar, future AI services)
CREATE TABLE external_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  submission_id UUID REFERENCES publisher_submissions(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES creative_files(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  external_task_id TEXT,
  corrections_count INTEGER,
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  error TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_external_tasks_submission_id ON external_tasks(submission_id);
CREATE INDEX idx_external_tasks_status ON external_tasks(status);
CREATE INDEX idx_external_tasks_source ON external_tasks(source);

-- External API calls analytics table
CREATE TABLE external_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  request_size INTEGER,
  response_time_ms INTEGER,
  status_code INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_external_calls_service ON external_calls(service);
CREATE INDEX idx_external_calls_created_at ON external_calls(created_at DESC);
CREATE INDEX idx_external_calls_status_code ON external_calls(status_code);
```

### Drizzle Schema Updates

**File:** `lib/schema.ts` (additions)

```typescript
export const publisherSubmissions = pgTable("publisher_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  trackingId: text("tracking_id").notNull().unique(),
  affiliateId: text("affiliate_id").notNull(),
  companyName: text("company_name").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  telegramId: text("telegram_id"),
  status: text("status").notNull().default("submitted"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const creatives = pgTable("creatives", {
  id: uuid("id").primaryKey().defaultRandom(),
  submissionId: uuid("submission_id").notNull().references(() => publisherSubmissions.id, { onDelete: "cascade" }),
  offerId: text("offer_id").notNull(),
  creativeType: text("creative_type").notNull(),
  priority: text("priority").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const creativeFiles = pgTable("creative_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  creativeId: uuid("creative_id").notNull().references(() => creatives.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  storagePath: text("storage_path").notNull(),
  fileType: text("file_type").notNull(),
  sizeBytes: integer("size_bytes"),
  mimeType: text("mime_type"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const submissionReviews = pgTable("submission_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  submissionId: uuid("submission_id").notNull().references(() => publisherSubmissions.id, { onDelete: "cascade" }),
  reviewerRole: text("reviewer_role").notNull(),
  reviewerId: text("reviewer_id").notNull(),
  decision: text("decision").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const externalTasks = pgTable("external_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: text("source").notNull(),
  submissionId: uuid("submission_id").references(() => publisherSubmissions.id, { onDelete: "set null" }),
  assetId: uuid("asset_id").references(() => creativeFiles.id, { onDelete: "set null" }),
  status: text("status").notNull().default("pending"),
  externalTaskId: text("external_task_id"),
  correctionsCount: integer("corrections_count"),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const externalCalls = pgTable("external_calls", {
  id: uuid("id").primaryKey().defaultRandom(),
  service: text("service").notNull(),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull().default("GET"),
  requestSize: integer("request_size"),
  responseTimeMs: integer("response_time_ms"),
  statusCode: integer("status_code"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

---

## Zod Schemas

**File:** `lib/validations/publisher.ts`

```typescript
import { z } from "zod";

export const PublisherSubmissionSchema = z.object({
  affiliateId: z.string().min(1, "Affiliate ID is required"),
  companyName: z.string().min(1, "Company name is required").max(255),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email address"),
  telegramId: z.string().optional(),
});

export const CreativeSchema = z.object({
  offerId: z.string().min(1, "Offer ID is required"),
  creativeType: z.enum(["image", "html", "zip"], {
    errorMap: () => ({ message: "Creative type must be image, html, or zip" }),
  }),
  priority: z.enum(["high", "medium"], {
    errorMap: () => ({ message: "Priority must be high or medium" }),
  }),
  notes: z.string().optional().max(5000),
});

export const FileUploadSchema = z.object({
  filename: z.string().min(1),
  fileType: z.enum(["image", "html", "zip"]),
  sizeBytes: z.number().int().positive().max(100 * 1024 * 1024), // 100MB max
  mimeType: z.string().optional(),
});

export const TrackingIdSchema = z.string().regex(/^[A-Z0-9]{12}$/, {
  message: "Tracking ID must be exactly 12 alphanumeric characters",
});

export const SubmissionStatusSchema = z.enum([
  "submitted",
  "admin_review",
  "admin_approved",
  "admin_rejected",
  "advertiser_review",
  "advertiser_approved",
  "advertiser_rejected",
]);

export const ReviewDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().optional().max(1000),
});
```

---

## API Endpoints

### Public Endpoints

#### GET /api/public/track/:trackingId

**Purpose:** Public tracking page (read-only)

**Authentication:** None (public)

**Request:**
```
GET /api/public/track/ABC123XYZ456
```

**Response:**
```json
{
  "success": true,
  "data": {
    "submission": {
      "id": "uuid",
      "trackingId": "ABC123XYZ456",
      "status": "admin_approved",
      "affiliateId": "AFF-123",
      "companyName": "Example Corp",
      "offerId": "offer-123",
      "creativeType": "html",
      "priority": "high",
      "createdAt": "2025-01-XXT10:00:00Z",
      "updatedAt": "2025-01-XXT11:00:00Z"
    },
    "statusHistory": [
      {
        "status": "submitted",
        "timestamp": "2025-01-XXT10:00:00Z"
      },
      {
        "status": "admin_approved",
        "timestamp": "2025-01-XXT10:30:00Z",
        "reviewer": "Admin User"
      }
    ],
    "creatives": [
      {
        "id": "uuid",
        "filename": "creative.html",
        "fileType": "html",
        "grammarStatus": "completed",
        "correctionsCount": 5
      }
    ],
    "grammarTasks": [
      {
        "id": "uuid",
        "status": "completed",
        "startedAt": "2025-01-XXT10:05:00Z",
        "finishedAt": "2025-01-XXT10:07:00Z"
      }
    ]
  }
}
```

**Error Responses:**
- `404`: Tracking ID not found
- `400`: Invalid tracking ID format

### Admin Endpoints

#### POST /api/admin/publisher/submissions

**Purpose:** Create submission from form data

**Authentication:** Admin only

**Request:**
```json
{
  "affiliateId": "AFF-123",
  "companyName": "Example Corp",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "telegramId": "@johndoe",
  "offerId": "offer-123",
  "creativeType": "html",
  "priority": "high",
  "notes": "Please review carefully"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "trackingId": "ABC123XYZ456",
    "status": "submitted",
    "createdAt": "2025-01-XXT10:00:00Z"
  }
}
```

#### POST /api/admin/publisher/submissions/:id/creative

**Purpose:** Attach creative to submission

**Request:** multipart/form-data
```
creativeId: uuid (optional, creates new if not provided)
files: File[] (required)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "creative": {
      "id": "uuid",
      "files": [
        {
          "id": "uuid",
          "filename": "creative.html",
          "fileType": "html"
        }
      ]
    }
  }
}
```

#### POST /api/admin/publisher/submissions/:id/submit

**Purpose:** Lock submission (make immutable)

**Response:**
```json
{
  "success": true,
  "data": {
    "submission": {
      "id": "uuid",
      "status": "submitted",
      "locked": true
    }
  }
}
```

#### POST /api/admin/publisher/:id/admin-approve

**Purpose:** Admin approves submission

**Request:**
```json
{
  "reason": "Looks good, forwarding to advertiser"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "submission": {
      "id": "uuid",
      "status": "admin_approved"
    }
  }
}
```

#### POST /api/admin/publisher/:id/admin-reject

**Purpose:** Admin rejects submission

**Request:**
```json
{
  "reason": "Creative does not meet brand guidelines"
}
```

#### POST /api/admin/publisher/:id/forward-to-advertiser

**Purpose:** Forward approved submission to advertiser

**Response:**
```json
{
  "success": true,
  "data": {
    "submission": {
      "id": "uuid",
      "status": "advertiser_review"
    }
  }
}
```

#### POST /api/admin/publisher/submissions/:id/process-grammar

**Purpose:** Trigger grammar processing for submission creatives

**Response:**
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "uuid",
        "externalTaskId": "task-123",
        "status": "pending"
      }
    ]
  }
}
```

#### GET /api/admin/publisher/submissions/:id/grammar-status

**Purpose:** Get grammar processing status

**Response:**
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "uuid",
        "status": "completed",
        "correctionsCount": 5,
        "startedAt": "2025-01-XXT10:05:00Z",
        "finishedAt": "2025-01-XXT10:07:00Z"
      }
    ]
  }
}
```

---

## Service Layer

### Submission Service

**File:** `features/publisher/services/submission.service.ts`

```typescript
import "server-only";
import { db } from "@/lib/db";
import { publisherSubmissions, creatives, creativeFiles } from "@/lib/schema";
import { generateTrackingId } from "@/lib/utils";

export async function createSubmission(data: {
  affiliateId: string;
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  telegramId?: string;
  offerId: string;
  creativeType: string;
  priority: string;
  notes?: string;
}) {
  const trackingId = await generateTrackingId();
  
  const [submission] = await db
    .insert(publisherSubmissions)
    .values({
      trackingId,
      affiliateId: data.affiliateId,
      companyName: data.companyName,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      telegramId: data.telegramId,
      status: "submitted",
    })
    .returning();

  const [creative] = await db
    .insert(creatives)
    .values({
      submissionId: submission.id,
      offerId: data.offerId,
      creativeType: data.creativeType,
      priority: data.priority,
      notes: data.notes,
    })
    .returning();

  return { submission, creative, trackingId };
}

export async function getSubmissionByTrackingId(trackingId: string) {
  const [submission] = await db
    .select()
    .from(publisherSubmissions)
    .where(eq(publisherSubmissions.trackingId, trackingId))
    .limit(1);

  return submission;
}

export async function updateSubmissionStatus(
  submissionId: string,
  newStatus: string,
  reviewerRole: string,
  reviewerId: string,
  reason?: string
) {
  await db.transaction(async (tx) => {
    await tx
      .update(publisherSubmissions)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(publisherSubmissions.id, submissionId));

    await tx.insert(submissionReviews).values({
      submissionId,
      reviewerRole,
      reviewerId,
      decision: newStatus.includes("approved") ? "approved" : "rejected",
      reason,
    });
  });
}
```

### Grammar Service

**File:** `features/publisher/services/grammar.service.ts`

```typescript
import "server-only";
import { logExternalCall } from "@/lib/analytics/externalCalls.service";

const GRAMMAR_API_BASE = "https://grammar-correction-1-5tha.onrender.com";

export async function processGrammar(
  filePath: string,
  filename: string
): Promise<{ taskId: string }> {
  const startTime = Date.now();
  
  try {
    const formData = new FormData();
    formData.append("file", await fetch(filePath).then(r => r.blob()));
    
    const response = await fetch(`${GRAMMAR_API_BASE}/process`, {
      method: "POST",
      body: formData,
    });

    const responseTime = Date.now() - startTime;
    
    await logExternalCall({
      service: "grammar_ai",
      endpoint: "/process",
      method: "POST",
      responseTimeMs: responseTime,
      statusCode: response.status,
    });

    if (!response.ok) {
      throw new Error(`Grammar API error: ${response.statusText}`);
    }

    const data = await response.json();
    return { taskId: data.task_id };
  } catch (error) {
    await logExternalCall({
      service: "grammar_ai",
      endpoint: "/process",
      method: "POST",
      responseTimeMs: Date.now() - startTime,
      statusCode: 500,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function getGrammarTaskStatus(taskId: string) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${GRAMMAR_API_BASE}/task/${taskId}`);
    const responseTime = Date.now() - startTime;
    
    await logExternalCall({
      service: "grammar_ai",
      endpoint: `/task/${taskId}`,
      method: "GET",
      responseTimeMs: responseTime,
      statusCode: response.status,
    });

    if (!response.ok) {
      throw new Error(`Grammar API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    await logExternalCall({
      service: "grammar_ai",
      endpoint: `/task/${taskId}`,
      method: "GET",
      responseTimeMs: Date.now() - startTime,
      statusCode: 500,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}
```

### Analytics Service

**File:** `lib/analytics/externalCalls.service.ts`

```typescript
import "server-only";
import { db } from "@/lib/db";
import { externalCalls } from "@/lib/schema";

export async function logExternalCall(data: {
  service: string;
  endpoint: string;
  method?: string;
  requestSize?: number;
  responseTimeMs: number;
  statusCode: number;
  errorMessage?: string;
}) {
  await db.insert(externalCalls).values({
    service: data.service,
    endpoint: data.endpoint,
    method: data.method || "GET",
    requestSize: data.requestSize,
    responseTimeMs: data.responseTimeMs,
    statusCode: data.statusCode,
    errorMessage: data.errorMessage,
  });
}

export async function getExternalCallsStats(service?: string, days: number = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const query = db
    .select({
      service: externalCalls.service,
      avgResponseTime: sql<number>`avg(${externalCalls.responseTimeMs})`,
      successRate: sql<number>`count(*) FILTER (WHERE ${externalCalls.statusCode} < 400)::float / count(*) * 100`,
      totalCalls: sql<number>`count(*)`,
    })
    .from(externalCalls)
    .where(
      and(
        gte(externalCalls.createdAt, since),
        service ? eq(externalCalls.service, service) : undefined
      )
    )
    .groupBy(externalCalls.service);

  return await query;
}
```

---

## Grammar AI Integration

### Grammar Client

**File:** `lib/grammarClient.ts`

```typescript
import "server-only";

const GRAMMAR_API_BASE = process.env.GRAMMAR_API_URL || 
  "https://grammar-correction-1-5tha.onrender.com";

export class GrammarClient {
  async process(file: File | Blob): Promise<{ task_id: string }> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${GRAMMAR_API_BASE}/process`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Grammar API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async getTaskStatus(taskId: string): Promise<any> {
    const response = await fetch(`${GRAMMAR_API_BASE}/task/${taskId}`);
    
    if (!response.ok) {
      throw new Error(`Grammar API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async download(filename: string): Promise<Blob> {
    const response = await fetch(`${GRAMMAR_API_BASE}/download/${filename}`);
    
    if (!response.ok) {
      throw new Error(`Grammar API error: ${response.statusText}`);
    }

    return await response.blob();
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${GRAMMAR_API_BASE}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const grammarClient = new GrammarClient();
```

---

## Analytics Implementation

### Operational Analytics

**File:** `features/analytics/services/operationalAnalytics.service.ts`

```typescript
import "server-only";
import { db } from "@/lib/db";
import { publisherSubmissions, externalCalls } from "@/lib/schema";
import { sql, and, gte, eq } from "drizzle-orm";

export async function getSubmissionsPerDay(days: number = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return await db
    .select({
      date: sql<string>`DATE(${publisherSubmissions.createdAt})`,
      count: sql<number>`count(*)`,
    })
    .from(publisherSubmissions)
    .where(gte(publisherSubmissions.createdAt, since))
    .groupBy(sql`DATE(${publisherSubmissions.createdAt})`)
    .orderBy(sql`DATE(${publisherSubmissions.createdAt}) DESC`);
}

export async function getApprovalRates() {
  const total = await db
    .select({ count: sql<number>`count(*)` })
    .from(publisherSubmissions);

  const approved = await db
    .select({ count: sql<number>`count(*)` })
    .from(publisherSubmissions)
    .where(eq(publisherSubmissions.status, "advertiser_approved"));

  return {
    total: total[0].count,
    approved: approved[0].count,
    rate: total[0].count > 0 ? (approved[0].count / total[0].count) * 100 : 0,
  };
}

export async function getAvgResponseTimes() {
  // Calculate average time from submitted to admin_approved
  const adminTimes = await db.execute(sql`
    SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_seconds
    FROM publisher_submissions
    WHERE status IN ('admin_approved', 'admin_rejected')
  `);

  // Calculate average time from admin_approved to advertiser_approved
  const advertiserTimes = await db.execute(sql`
    SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_seconds
    FROM publisher_submissions
    WHERE status IN ('advertiser_approved', 'advertiser_rejected')
  `);

  return {
    adminAvgSeconds: adminTimes.rows[0]?.avg_seconds || 0,
    advertiserAvgSeconds: advertiserTimes.rows[0]?.avg_seconds || 0,
  };
}
```

---

## Testing Plan

### Unit Tests

**File:** `__tests__/publisher/submission.test.ts`

```typescript
import { createSubmission, updateSubmissionStatus } from "@/features/publisher/services/submission.service";

describe("Submission Service", () => {
  test("creates submission with tracking ID", async () => {
    const result = await createSubmission({
      affiliateId: "AFF-123",
      companyName: "Test Corp",
      firstName: "John",
      lastName: "Doe",
      email: "john@test.com",
      offerId: "offer-123",
      creativeType: "html",
      priority: "high",
    });

    expect(result.trackingId).toMatch(/^[A-Z0-9]{12}$/);
    expect(result.submission.status).toBe("submitted");
  });

  test("validates status transitions", async () => {
    // Test valid transition
    await expect(
      updateSubmissionStatus("sub-id", "admin_approved", "admin", "admin-id")
    ).resolves.not.toThrow();

    // Test invalid transition
    await expect(
      updateSubmissionStatus("sub-id", "advertiser_approved", "admin", "admin-id")
    ).rejects.toThrow();
  });
});
```

### Integration Tests

**File:** `__tests__/publisher/api.test.ts`

```typescript
describe("Publisher API", () => {
  test("POST /api/admin/publisher/submissions creates submission", async () => {
    const response = await fetch("/api/admin/publisher/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        affiliateId: "AFF-123",
        companyName: "Test Corp",
        firstName: "John",
        lastName: "Doe",
        email: "john@test.com",
        offerId: "offer-123",
        creativeType: "html",
        priority: "high",
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.trackingId).toMatch(/^[A-Z0-9]{12}$/);
  });

  test("GET /api/public/track/:trackingId returns submission", async () => {
    // First create submission
    const createRes = await fetch("/api/admin/publisher/submissions", { /* ... */ });
    const { trackingId } = await createRes.json();

    // Then track it
    const trackRes = await fetch(`/api/public/track/${trackingId}`);
    expect(trackRes.status).toBe(200);
    const data = await trackRes.json();
    expect(data.data.submission.trackingId).toBe(trackingId);
  });
});
```

### Manual Testing Checklist

- [ ] Submit full form → entry created
- [ ] Receive email with tracking ID
- [ ] Receive Telegram notification (if ID provided)
- [ ] See submission in Admin → Manage Requests
- [ ] Admin can view same submission window
- [ ] Admin approves → status updates
- [ ] Forward to advertiser → status updates
- [ ] Advertiser approves → final status
- [ ] Tracking page shows correct status
- [ ] Grammar processing works
- [ ] Ops dashboard shows external calls
- [ ] Analytics metrics accurate

---

## Implementation Checklist

### Sprint 9.1
- [ ] Create database migrations
- [ ] Update Drizzle schema
- [ ] Create Zod schemas
- [ ] Implement submission service
- [ ] Create POST /api/admin/publisher/submissions
- [ ] Create POST /api/admin/publisher/submissions/:id/creative
- [ ] Create POST /api/admin/publisher/submissions/:id/submit
- [ ] Generate tracking ID utility

### Sprint 9.2
- [ ] Implement status transition logic
- [ ] Create GET /api/public/track/:trackingId
- [ ] Create approval/rejection endpoints
- [ ] Implement submission reviews logging
- [ ] Create tracking service

### Sprint 9.3
- [ ] Create grammar client
- [ ] Implement grammar service
- [ ] Create external_tasks table
- [ ] Create external_calls table
- [ ] Implement analytics logging
- [ ] Create grammar processing endpoints
- [ ] Background job integration

### Sprint 9.4
- [ ] Update Admin Manage Requests page
- [ ] Create SubmissionDetails component
- [ ] Update Ops dashboard
- [ ] Add External Operations section
- [ ] Add Publisher Funnel metrics
- [ ] Add Processing Health metrics

### Sprint 9.5
- [ ] Implement email notifications
- [ ] Implement Telegram notifications
- [ ] Create notification templates
- [ ] Add notification hooks
- [ ] End-to-end testing
- [ ] Documentation

---

**Last Updated:** 2025-01-XX  
**Next Review:** After Sprint 9.1 completion
