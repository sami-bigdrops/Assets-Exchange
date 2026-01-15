# Backend Implementation - Sequential Completion Plan

**Created:** 2025-12-27  
**For:** Yash (Backend Lead)  
**Status:** Planning Phase

---

## Overview

This document consolidates all backend tasks from:
- Notion project tasks (Sprint 1 & Sprint 2)
- TODO markdown files (Backend_Implementation_TODOs.md, BACKEND_TODOS_SUMMARY.md, STATS_AND_CHARTS_BACKEND_TODOS.md)
- Code TODOs (120+ `TODO: BACKEND` comments in codebase)

**Total Tasks Identified:** 50+ backend implementation items

---

## Phase 1: Foundation & Database Schema (Week 1)

### 1.1 Database Schema Implementation

**Priority:** CRITICAL  
**Status:** Partially Done (users, sessions, accounts exist)

#### Tasks:
1. ✅ **Install Drizzle ORM + NeonDB client** (Done - Sprint 1)
2. ✅ **Create users & roles schema** (Done - Sprint 1)
3. ⏳ **Create tenants table schema** (Backlog - Sprint 1, moved from Hold)
   - Multi-tenant support
   - Tenant branding fields
   - Note: Architecture uses isolated per-tenant deployments, but tenant table may still be needed for admin management
   - Reference: Notion task ID `2d557c77-ca86-81f4-abf3-ff4d2346d38a`
   - Story Points: 2
   - Epic: EPIC 3 — Database & Multi-Tenant Schema
   - Area: db
   - Reference: `docs/Backend_Implementation_TODOs.md` line 38-72
   
4. ⏳ **Add "submissions" table schema** (Backlog - Sprint 2)
   - Unified creative_requests table (see UNIFIED_MODEL_EXPLANATION.md)
   - All fields from `features/admin/types/admin.types.ts` lines 41-90
   - Status: new, pending, approved, rejected, sent-back
   - Approval stages: admin, advertiser, completed
   - Admin & advertiser tracking fields
   
5. ⏳ **Add "annotations" table schema** (Backlog - Sprint 2)
   - Annotation tracking for creatives
   - Shape/comment storage
   - Reference: Epic 3 tasks
   
6. ✅ **Run Drizzle migration to NeonDB** (Done - Sprint 1)
7. ⏳ **Run Drizzle migration for submissions + annotations** (Backlog - Sprint 2)
   - Create migration file
   - Test migration
   - Verify indexes

**Files to Create/Update:**
- `lib/schema.ts` - Add new table definitions
- `drizzle/migrations/` - Create migration files
- Reference: `features/admin/types/admin.types.ts` (lines 29-110) for SQL schema

---

### 1.2 Database Seed & Initial Data

**Priority:** HIGH  
**Status:** Partially Done

#### Tasks:
1. ✅ **Add initial seed script (SuperAdmin + sample tenant)** (Done - Sprint 1)
2. ⏳ **Enhance seed script with sample data**
   - Sample creative requests
   - Sample offers
   - Sample advertisers/publishers
   - Reference: `seed-scripts/` directory

**Files:**
- `seed-scripts/seed.ts` or similar
- `app/api/admin/seed/route.ts` (exists, may need enhancement)

---

## Phase 2: Authentication & RPC Infrastructure (Week 1-2)

### 2.1 Authentication Setup

**Priority:** CRITICAL  
**Status:** Partially Done

#### Tasks:
1. ✅ **Install BetterAuth** (Done - Sprint 1)
2. ✅ **Configure BetterAuth provider** (Done - Sprint 1)
3. ✅ **Add user session helpers** (Done - Sprint 1)
4. ✅ **Implement role-based access guards** (Done - Sprint 1)
5. ✅ **Create protected layouts** (Done - Sprint 1)
6. ⏳ **Expose auth/session RPC helpers (currentUser, currentRole)** (Backlog - Sprint 2)
   - Add to `lib/rpc/router.ts`
   - Create `auth` namespace in RPC router
   - Functions: `currentUser()`, `currentRole()`, `checkPermission()`
   - Reference: Notion task ID `2d557c77-ca86-812e-b68a-d6862782b421`

**Files to Update:**
- `lib/rpc/router.ts` - Add auth procedures
- `lib/auth-helpers.ts` - May need enhancement
- `app/api/rpc/[...path]/route.ts` - Verify routing

---

### 2.2 RPC Router Setup

**Priority:** HIGH  
**Status:** Partially Done

#### Tasks:
1. ✅ **Install oRPC & set up base RPC router** (Done - Sprint 1)
2. ⏳ **Add RPC endpoints** (Backlog - Sprint 2)
   - Organize by feature (admin, offers, advertisers, etc.)
   - Create namespace structure
   - Reference: Notion task ID `2d557c77-ca86-8191-8c3b-caa50412eb4e`

**Structure:**
```
lib/rpc/router.ts
├── health (done)
├── auth (to do)
│   ├── currentUser
│   └── currentRole
├── admin (to do)
│   ├── dashboard
│   ├── requests
│   └── responses
├── offers (to do)
├── advertisers (to do)
└── publishers (to do)
```

---

## Phase 3: Core API Endpoints - Dashboard & Statistics (Week 2)

### 3.1 Dashboard Statistics API

**Priority:** HIGH  
**Status:** ✅ **COMPLETED** (2025-01-XX)

#### Tasks:
1. ✅ **Implement admin dashboard backend** (Done - Phase 3.1)
   - Reference: Notion task ID `2d557c77-ca86-8182-a401-c9e89e1ae5c7`
   - Epic: EPIC 5 — Admin Dashboard & Review Workflow
   - Implementation: `features/admin/services/dashboard.service.ts`
   - API: `app/api/admin/dashboard/stats/route.ts`
   
2. ✅ **GET /api/admin/dashboard/stats** (Done - Phase 3.1)
   - Calculate 5 statistics:
     * Total Assets
     * New Requests
     * Approved Assets
     * Rejected Assets
     * Pending Approval
   - Include trends (today vs yesterday)
   - Include historical data (Yesterday, Current Month, Last Month)
   - Cache with 2-minute TTL (Redis)
   - Reference: `docs/STATS_AND_CHARTS_BACKEND_TODOS.md` lines 18-80
   - Reference: `features/admin/services/admin.service.ts` line 125

**SQL Queries Needed:**
- See `docs/STATS_AND_CHARTS_BACKEND_TODOS.md` for complete SQL examples
- Total Assets: UNION of publisher_requests + advertiser_responses
- New Requests: WHERE status='new' AND approval_stage='admin'
- Approved: WHERE status='approved' AND approval_stage='completed'
- Rejected: WHERE status='rejected'
- Pending: WHERE status IN ('new', 'pending')

**Files to Create/Update:**
- `lib/rpc/router.ts` - Add `admin.dashboard.stats` procedure
- `features/admin/services/admin.service.ts` - Replace mock data (line 125)
- `features/admin/models/admin.model.ts` - Remove after implementation (marked for deletion)

---

### 3.2 Performance Chart API

**Priority:** HIGH  
**Status:** Not Started

#### Tasks:
1. ⏳ **GET /api/admin/dashboard/performance?comparisonType={type}**
   - Support 4 comparison types:
     * "Today vs Yesterday" (24 hourly points)
     * "Today vs Last Week" (24 hourly points)
     * "Current Week vs Last Week" (7 daily points)
     * "Current Month vs Last Month" (31 daily points)
   - Time-series aggregation
   - Fill missing data points with 0
   - Cache with 5-15 minute TTL
   - Reference: `docs/STATS_AND_CHARTS_BACKEND_TODOS.md` lines 83-118
   - Reference: `features/admin/services/performance-chart.service.ts` line 153

**SQL Aggregation Examples:**
- See `docs/STATS_AND_CHARTS_BACKEND_TODOS.md` for hourly/daily/monthly queries
- Use GROUP BY with DATE(), HOUR(), DAYOFWEEK(), etc.

**Files to Create/Update:**
- `lib/rpc/router.ts` - Add `admin.dashboard.performance` procedure
- `features/admin/services/performance-chart.service.ts` - Replace mock (line 153)
- `features/admin/models/performance-chart.model.ts` - Remove after (marked for deletion)

---

## Phase 4: Core API Endpoints - Requests & Responses (Week 2-3)

### 4.1 Request/Response Read Operations

**Priority:** HIGH  
**Status:** ✅ **COMPLETED** (Phase 3.2)

#### Tasks:
1. ✅ **GET /api/admin/requests** (Done - Phase 3.2)
   - Pagination (page, limit)
   - Filtering (status, approvalStage, priority, search, dateFrom, dateTo)
   - Sorting (date, priority, advertiserName, createdAt)
   - Reference: `features/admin/services/request.service.ts` line 56
   - Reference: `docs/Backend_Implementation_TODOs.md` lines 448-504

2. ⏳ **GET /api/admin/requests/recent?limit=3** (Not Implemented)
   - Most recent requests for dashboard
   - Reference: `features/admin/services/request.service.ts` line 80

3. ✅ **GET /api/admin/requests/:id** (Done - Phase 3.2)
   - Single request with full details
   - Implementation: `app/api/admin/requests/[id]/route.ts`
   - Reference: `features/admin/services/request.service.ts`

4. ✅ **GET /api/admin/responses** (Done - Phase 3.3)
   - Advertiser responses endpoint
   - Implementation: `app/api/advertiser/responses/route.ts`
   - Filtered by advertiserId ownership

5. ⏳ **GET /api/admin/responses/recent?limit=3** (Not Implemented)
   - Reference: `features/admin/services/request.service.ts` line 172

6. ⏳ **GET /api/admin/responses/:id** (Not Implemented)
   - Single response with details
   - Reference: `features/admin/services/request.service.ts`

7. ⏳ **GET /api/admin/requests/:id/related-response** (Not Implemented)
   - Get related advertiser response
   - Reference: `docs/Backend_Implementation_TODOs.md` lines 696-702

8. ⏳ **GET /api/admin/responses/:id/related-request** (Not Implemented)
   - Get related publisher request
   - Reference: `docs/Backend_Implementation_TODOs.md` lines 704-710

**Files to Create/Update:**
- `lib/rpc/router.ts` - Add `admin.requests.*` and `admin.responses.*` procedures
- `features/admin/services/request.service.ts` - Replace all mock data calls
- `features/admin/models/request.model.ts` - Remove after (marked for deletion)
- `features/admin/models/response.model.ts` - Remove after (marked for deletion)

**Key Implementation Notes:**
- Use unified model (ONE table: creative_requests)
- See `docs/UNIFIED_MODEL_EXPLANATION.md` for architecture
- Status filtering: WHERE status IN (...)
- Search: LIKE on advertiser_name, offer_name, client_name
- Pagination: LIMIT/OFFSET or cursor-based

---

### 4.2 Request/Response Write Operations

**Priority:** HIGH  
**Status:** ✅ **COMPLETED** (Phase 3.2, 3.3, 3.4, 3.5)

#### Tasks:
1. ✅ **POST /api/admin/requests/:id/approve** (Done - Phase 3.2)
   - Validate: status='new', approvalStage='admin'
   - Update request: status='pending', approvalStage='advertiser'
   - Log in status history (Phase 3.5)
   - Send notification (Phase 3.4)
   - Atomic transaction
   - Implementation: `app/api/admin/requests/[id]/approve/route.ts`
   - Service: `features/admin/services/request.service.ts` - `approveRequest()`

2. ✅ **POST /api/admin/requests/:id/reject** (Done - Phase 3.2)
   - Update status to 'rejected'
   - Require comments
   - Log action (Phase 3.5)
   - Send notification to publisher (Phase 3.4)
   - Implementation: `app/api/admin/requests/[id]/reject/route.ts`
   - Service: `features/admin/services/request.service.ts` - `rejectRequest()`

3. ✅ **POST /api/advertiser/responses/:id/approve** (Done - Phase 3.3)
   - Update status to 'sent-back'
   - Keep approvalStage='advertiser'
   - Makes it appear in admin's "Sent Back" tab
   - Reference: `docs/Backend_Implementation_TODOs.md` lines 665-692
   - Reference: `features/admin/components/RequestItem.tsx` line 1193

**Business Logic:**
- State transition validation (see `docs/Backend_Implementation_TODOs.md` lines 1491-1524)
- Status history logging (automatic via triggers or application code)
- Notification triggers
- Transaction management

**Files to Create/Update:**
- `lib/rpc/router.ts` - Add action procedures
- `features/admin/services/request.service.ts` - Implement action functions
- `features/admin/components/RequestItem.tsx` - Wire up handlers (lines 507, 572, 792, 860, 1193, 1261)

---

## Phase 5: Offers Management APIs (Week 3)

### 5.1 Offers CRUD Operations

**Priority:** HIGH  
**Status:** ✅ **COMPLETED** (Phase 3.6, 3.9)

#### Tasks:
1. ✅ **GET /api/admin/offers** (Done - Phase 3.6)
   - Filtering by status (defaults to "Active")
   - Search: offerName
   - Implementation: `app/api/admin/offers/route.ts`
   - Service: `features/admin/services/offer.service.ts` - `listOffers()`

2. ✅ **GET /api/admin/offers/:id** (Done - Phase 3.6)
   - Include brand guidelines
   - Implementation: `app/api/admin/offers/[id]/route.ts`
   - Service: `features/admin/services/offer.service.ts` - `getOffer()`

3. ✅ **POST /api/admin/offers** (Done - Phase 3.6)
   - Create offer manually
   - Implementation: `app/api/admin/offers/route.ts`
   - Service: `features/admin/services/offer.service.ts` - `createOffer()`

4. ✅ **PUT /api/admin/offers/:id** (Done - Phase 3.6)
   - Update offer
   - Implementation: `app/api/admin/offers/[id]/route.ts`
   - Service: `features/admin/services/offer.service.ts` - `updateOffer()`

5. ✅ **DELETE /api/admin/offers/:id** (Done - Phase 3.6)
   - Soft delete (sets status to "Inactive")
   - Implementation: `app/api/admin/offers/[id]/route.ts`
   - Service: `features/admin/services/offer.service.ts` - `softDeleteOffer()`

6. ⏳ **PATCH /api/admin/offers/:id/status** (Not Implemented)
   - Update status only
   - Reference: `features/admin/services/offers.service.ts` line 322
   - Reference: `docs/Backend_Implementation_TODOs.md` lines 1066-1088

7. ⏳ **PATCH /api/admin/offers/:id/visibility** (Not Implemented)
   - Update visibility (Public/Internal/Hidden)
   - Called frequently from UI dropdown
   - Optimistic updates recommended
   - Reference: `features/admin/services/offers.service.ts` line 367
   - Reference: `features/admin/components/Offers.tsx` line 373
   - Reference: `docs/Backend_Implementation_TODOs.md` lines 1090-1113

8. ⏳ **POST /api/admin/offers/bulk-update** (Not Implemented)
   - Bulk update multiple offers
   - Support file upload for brand guidelines
   - Return success/failure per offer
   - Reference: `features/admin/services/offers.service.ts` line 418
   - Reference: `features/admin/components/BulkEditModal.tsx` line 269
   - Reference: `docs/Backend_Implementation_TODOs.md` lines 1115-1177

9. ⏳ **POST /api/admin/offers/pull-from-api** (See Phase 5.5 - Everflow Integration)
   - Moved to dedicated Everflow Integration phase
   - Reference: Phase 5.5 for complete implementation details

**Files to Create/Update:**
- `lib/rpc/router.ts` - Add `offers.*` procedures
- `features/admin/services/offers.service.ts` - Replace all mock calls (29 TODOs)
- `features/admin/components/Offers.tsx` - Wire up handlers (lines 264, 316, 373, 469)
- `features/admin/components/BulkEditModal.tsx` - Wire up bulk update (line 269)
- `features/admin/components/OfferDetailsModal.tsx` - Wire up update (line 193)
- `features/admin/components/NewOfferManuallyModal.tsx` - Wire up creation (line 110)

**Database Schema Needed:**
- `offers` table (not yet in schema.ts)
- `brand_guidelines` table or JSONB column
- See `docs/Backend_Implementation_TODOs.md` for schema design

---

## Phase 5.5: Everflow Integration (Week 3-4)

**Priority:** HIGH  
**Status:** Not Started  
**Reference:** Working implementation at https://github.com/Yash-BigDrops/admin_portal

### Overview

This phase covers integration with Everflow API for syncing offers and advertisers. The integration allows pulling data from Everflow platform to keep offers and advertisers synchronized.

### 5.5.1 Everflow API Configuration

**Priority:** HIGH  
**Status:** Not Started

#### Tasks:
1. ⏳ **Create Everflow API service wrapper**
   - Install Everflow API client library (if available) or use HTTP client
   - Create `lib/services/everflow.service.ts`
   - Implement authentication (API key/token based)
   - Handle rate limiting and retries
   - Reference: Working implementation in admin_portal repository

2. ⏳ **Add Everflow API credentials to environment variables**
   - `EVERFLOW_API_KEY` or `EVERFLOW_API_TOKEN`
   - `EVERFLOW_API_BASE_URL`
   - `EVERFLOW_NETWORK_ID` (if applicable)
   - Add to `env.js` with validation
   - Store credentials securely (encrypted at rest)

3. ⏳ **Create Everflow configuration management**
   - RPC endpoint: `admin.everflow.getConfig`
   - RPC endpoint: `admin.everflow.updateConfig`
   - Allow admin to configure API credentials via UI
   - Store configuration in database (encrypted)
   - Validate credentials on save

**Files to Create/Update:**
- `lib/services/everflow.service.ts` - Everflow API client
- `lib/schema.ts` - Add `everflow_config` table (if storing in DB)
- `lib/rpc/router.ts` - Add `admin.everflow.*` procedures
- `env.js` - Add Everflow environment variables

---

### 5.5.2 Offers Sync from Everflow

**Priority:** HIGH  
**Status:** Not Started

#### Tasks:
1. ⏳ **POST /api/admin/offers/pull-from-everflow**
   - Sync offers from Everflow API
   - Fetch offers using Everflow API endpoints
   - Map Everflow offer fields to internal offer schema
   - Compare with existing offers (by `offerId` or external ID)
   - Create new offers that don't exist
   - Update existing offers that have changed
   - Handle field mapping and data transformation
   - Reference: `features/admin/services/offers.service.ts` line 571
   - Reference: `features/admin/components/Offers.tsx` line 469
   - Reference: Working implementation in admin_portal repository

2. ⏳ **Implement offer mapping logic**
   - Map Everflow offer fields to internal schema
   - Handle required vs optional fields
   - Default value assignment
   - Field type conversions (string to number, date parsing, etc.)
   - Handle nested data structures

3. ⏳ **Implement conflict resolution**
   - Strategy: API wins, Manual wins, or prompt user
   - Detect conflicts (manual edits vs API updates)
   - Log all conflicts for review
   - Allow admin to configure conflict resolution strategy
   - Reference: `docs/Backend_Implementation_TODOs.md` lines 1235-1239

4. ⏳ **Add sync filtering and options**
   - Filter by advertiser IDs
   - Filter by date range (only sync offers updated after X date)
   - Filter by status (Active/Inactive)
   - Force full sync vs incremental sync
   - Reference: `docs/Backend_Implementation_TODOs.md` lines 1184-1196

5. ⏳ **Implement background job processing**
   - Use Redis queue or similar for long-running syncs
   - Job status endpoint: `GET /api/admin/offers/sync-status/:jobId`
   - Progress tracking and reporting
   - Allow cancellation of running syncs
   - Reference: `docs/Backend_Implementation_TODOs.md` lines 1223-1227

6. ⏳ **Add sync history and logging**
   - Create `offer_sync_history` table
   - Log all sync operations (start time, end time, results)
   - Track: synced count, created count, updated count, skipped count, errors
   - Store error details for failed syncs
   - Reference: `docs/Backend_Implementation_TODOs.md` lines 1229-1233

**Request Body:**
```typescript
{
  source?: "everflow",              // API source identifier
  force?: boolean,                   // Force full sync vs incremental
  filters?: {
    advertiserIds?: string[],
    dateRange?: { from: string, to: string },
    status?: "Active" | "Inactive"
  }
}
```

**Response:**
```typescript
{
  success: boolean,
  jobId?: string,                    // If async job
  synced: number,                    // Number of offers synced
  created: number,                    // Number of new offers created
  updated: number,                    // Number of existing offers updated
  skipped: number,                   // Number of offers skipped (no changes)
  errors: Array<{
    offerId?: string,
    error: string,
    reason: string
  }>,
  duration: number                   // Sync duration in milliseconds
}
```

**Files to Create/Update:**
- `lib/services/everflow.service.ts` - Add `syncOffers()` method
- `lib/rpc/router.ts` - Add `admin.offers.pullFromEverflow` procedure
- `lib/schema.ts` - Add `offer_sync_history` table
- `features/admin/services/offers.service.ts` - Wire up Everflow sync

---

### 5.5.3 Advertisers Sync from Everflow

**Priority:** MEDIUM  
**Status:** Not Started

#### Tasks:
1. ⏳ **POST /api/admin/advertisers/pull-from-everflow**
   - Sync advertisers from Everflow API
   - Fetch advertisers using Everflow API endpoints
   - Map Everflow advertiser fields to internal advertiser schema
   - Compare with existing advertisers (by `advertiserId` or external ID)
   - Create new advertisers that don't exist
   - Update existing advertisers that have changed
   - Reference: `features/admin/components/Advertiser.tsx` line 372
   - Reference: Working implementation in admin_portal repository

2. ⏳ **Implement advertiser mapping logic**
   - Map Everflow advertiser fields to internal schema
   - Handle required vs optional fields
   - Default value assignment (e.g., `advPlatform: "Everflow"`)
   - Field type conversions
   - Handle nested data structures

3. ⏳ **Implement conflict resolution**
   - Same strategy as offers sync
   - Detect conflicts (manual edits vs API updates)
   - Log all conflicts for review

4. ⏳ **Add sync filtering and options**
   - Filter by advertiser IDs
   - Filter by date range
   - Filter by status (Active/Inactive)
   - Force full sync vs incremental sync

5. ⏳ **Implement background job processing**
   - Use Redis queue for long-running syncs
   - Job status endpoint: `GET /api/admin/advertisers/sync-status/:jobId`
   - Progress tracking and reporting
   - Allow cancellation of running syncs

6. ⏳ **Add sync history and logging**
   - Create `advertiser_sync_history` table
   - Log all sync operations
   - Track: synced count, created count, updated count, skipped count, errors
   - Store error details for failed syncs

**Request Body:**
```typescript
{
  source?: "everflow",
  force?: boolean,
  filters?: {
    advertiserIds?: string[],
    dateRange?: { from: string, to: string },
    status?: "Active" | "Inactive"
  }
}
```

**Response:**
```typescript
{
  success: boolean,
  jobId?: string,
  synced: number,
  created: number,
  updated: number,
  skipped: number,
  errors: Array<{
    advertiserId?: string,
    error: string,
    reason: string
  }>,
  duration: number
}
```

**Files to Create/Update:**
- `lib/services/everflow.service.ts` - Add `syncAdvertisers()` method
- `lib/rpc/router.ts` - Add `admin.advertisers.pullFromEverflow` procedure
- `lib/schema.ts` - Add `advertiser_sync_history` table
- `features/admin/services/advertiser.service.ts` - Wire up Everflow sync

---

### 5.5.4 Sync Scheduling and Automation

**Priority:** LOW  
**Status:** Not Started

#### Tasks:
1. ⏳ **Implement scheduled sync jobs**
   - Use cron jobs or scheduled tasks
   - Allow admin to configure sync schedule (daily, weekly, etc.)
   - Store schedule configuration in database
   - Support multiple schedules (offers sync, advertisers sync)

2. ⏳ **Add sync notifications**
   - Email notifications on sync completion
   - Email notifications on sync errors
   - In-app notifications for sync status
   - Configurable notification preferences

3. ⏳ **Add sync monitoring dashboard**
   - Display last sync time and status
   - Show sync statistics (success rate, error rate)
   - Display recent sync history
   - Show pending/failed syncs

**Files to Create/Update:**
- `lib/jobs/sync-scheduler.ts` - Scheduled sync jobs
- `lib/rpc/router.ts` - Add sync scheduling procedures
- `lib/schema.ts` - Add `sync_schedules` table (if storing in DB)

---

### 5.5.5 Error Handling and Retry Logic

**Priority:** HIGH  
**Status:** Not Started

#### Tasks:
1. ⏳ **Implement retry logic for API calls**
   - Exponential backoff for failed requests
   - Max retry attempts (configurable)
   - Handle rate limiting (429 errors)
   - Handle timeout errors

2. ⏳ **Add comprehensive error handling**
   - 400: Invalid request parameters - show validation errors
   - 401: Unauthorized (API credentials invalid) - show error, link to settings
   - 403: Forbidden (no permission to sync) - show permission denied
   - 408: Request timeout - show timeout, offer retry
   - 500: Server error or external API error - show error with retry
   - 503: External API unavailable - show error, suggest retry later
   - Reference: `docs/Backend_Implementation_TODOs.md` lines 1215-1221

3. ⏳ **Add error logging and alerting**
   - Log all API errors with context
   - Alert on repeated failures
   - Track error rates and patterns
   - Store error details in sync history

**Files to Create/Update:**
- `lib/services/everflow.service.ts` - Add retry logic
- `lib/logger.ts` - Add Everflow-specific logging

---

**Database Schema Needed:**
- `everflow_config` table (optional - for storing API credentials)
- `offer_sync_history` table
- `advertiser_sync_history` table
- `sync_schedules` table (optional - for scheduled syncs)

**Key Implementation Notes:**
- Reference working implementation in https://github.com/Yash-BigDrops/admin_portal
- Ensure API credentials are stored securely (encrypted)
- Handle rate limiting from Everflow API
- Support both full sync and incremental sync
- Implement proper conflict resolution strategy
- Add comprehensive logging and monitoring

---

## Phase 6: Advertisers & Publishers Management APIs (Week 3-4)

### 6.1 Advertisers CRUD Operations

**Priority:** MEDIUM  
**Status:** Not Started

#### Tasks:
1. ⏳ **GET /api/admin/advertisers**
   - Similar to offers endpoint
   - Reference: `features/admin/services/advertiser.service.ts` line 25
   - Reference: `docs/Backend_Implementation_TODOs.md` lines 1241-1251

2. ⏳ **GET /api/admin/advertisers/:id**
   - Reference: `features/admin/services/advertiser.service.ts` line 76

3. ⏳ **POST /api/admin/advertisers**
   - Create advertiser
   - Reference: `features/admin/services/advertiser.service.ts` line 92
   - Reference: `features/admin/view-models/useNewAdvertiserManuallyViewModel.ts` line 23

4. ⏳ **PUT /api/admin/advertisers/:id**
   - Update advertiser
   - Reference: `features/admin/services/advertiser.service.ts` line 112
   - Reference: `features/admin/components/AdvertiserDetailsModal.tsx` line 197

5. ⏳ **DELETE /api/admin/advertisers/:id**
   - Reference: `features/admin/services/advertiser.service.ts` line 133

6. ⏳ **PATCH /api/admin/advertisers/:id/status**
   - Reference: `features/admin/services/advertiser.service.ts` line 151

7. ⏳ **POST /api/admin/advertisers/pull-from-api**
   - Sync from external API
   - Reference: `features/admin/services/advertiser.service.ts`
   - Reference: `features/admin/components/Advertiser.tsx` line 299

**Files to Create/Update:**
- `lib/rpc/router.ts` - Add `advertisers.*` procedures
- `features/admin/services/advertiser.service.ts` - Replace all mock calls (7 TODOs)
- `features/admin/components/Advertiser.tsx` - Wire up handlers (lines 213, 240, 299)
- `features/admin/components/AdvertiserDetailsModal.tsx` - Wire up update (line 197)

---

### 6.2 Publishers CRUD Operations

**Priority:** MEDIUM  
**Status:** ✅ **COMPLETED** (Phase 3.8)

#### Tasks:
1. ✅ **GET /api/admin/publishers** (Done - Phase 3.8)
   - Search by name
   - Implementation: `app/api/admin/publishers/route.ts`
   - Service: `features/admin/services/publisher.service.ts` - `listPublishers()`

2. ✅ **GET /api/admin/publishers/:id** (Done - Phase 3.8)
   - Single publisher with details
   - Implementation: `app/api/admin/publishers/[id]/route.ts`
   - Service: `features/admin/services/publisher.service.ts` - `getPublisher()`

3. ✅ **POST /api/admin/publishers** (Done - Phase 3.8)
   - Create publisher manually
   - Implementation: `app/api/admin/publishers/route.ts`
   - Service: `features/admin/services/publisher.service.ts` - `createPublisher()`

4. ✅ **PUT /api/admin/publishers/:id** (Done - Phase 3.8)
   - Update publisher
   - Implementation: `app/api/admin/publishers/[id]/route.ts`
   - Service: `features/admin/services/publisher.service.ts` - `updatePublisher()`

5. ✅ **DELETE /api/admin/publishers/:id** (Done - Phase 3.8)
   - Soft delete (sets status to "inactive")
   - Implementation: `app/api/admin/publishers/[id]/route.ts`
   - Service: `features/admin/services/publisher.service.ts` - `softDeletePublisher()`

6. ⏳ **PATCH /api/admin/publishers/:id/status** (Not Implemented)
   - Reference: `features/admin/services/publisher.service.ts`

**Files to Create/Update:**
- `lib/rpc/router.ts` - Add `publishers.*` procedures
- `features/admin/services/publisher.service.ts` - Replace all mock calls (6 TODOs)
- `features/admin/components/Publisher.tsx` - Wire up handlers (line 147)

---

## Phase 7: Brand Guidelines Management (Week 4)

### 7.1 Brand Guidelines APIs

**Priority:** MEDIUM  
**Status:** ✅ **PARTIALLY COMPLETED** (Phase 3.9)

#### Tasks:
1. ⏳ **GET /api/admin/{entityType}s/:id/brand-guidelines** (Not Implemented)
   - Supports: offers, advertisers, publishers
   - Returns: type, url/fileUrl, text, notes
   - Reference: `features/admin/components/BrandGuidelinesModal.tsx` line 98
   - Reference: `docs/Backend_Implementation_TODOs.md` lines 1356-1388

2. ✅ **POST /api/admin/offers/:id/brand-guidelines** (Done - Phase 3.9)
   - Attach brand guidelines file to offer
   - Implementation: `app/api/admin/offers/[id]/brand-guidelines/route.ts`
   - Service: `features/admin/services/brandGuidelines.service.ts` - `attachBrandGuidelines()`
   - Validates file status is "clean" before attaching

3. ✅ **DELETE /api/admin/offers/:id/brand-guidelines** (Done - Phase 3.9)
   - Detach brand guidelines from offer
   - Implementation: `app/api/admin/offers/[id]/brand-guidelines/route.ts`
   - Service: `features/admin/services/brandGuidelines.service.ts` - `detachBrandGuidelines()`

4. ⏳ **PUT /api/admin/{entityType}s/:id/brand-guidelines** (Not Fully Implemented)
   - Create/update brand guidelines
   - Support: URL, file upload, rich text
   - File upload: multipart/form-data, max 10MB, .doc/.docx/.pdf
   - Store files in S3/R2/Vercel Blob
   - Reference: `features/admin/components/BrandGuidelinesModal.tsx` line 219
   - Reference: `docs/Backend_Implementation_TODOs.md` lines 1390-1456

**Files to Create/Update:**
- `lib/rpc/router.ts` - Add `brandGuidelines.*` procedures
- `features/admin/components/BrandGuidelinesModal.tsx` - Wire up handlers (lines 98, 219)
- File storage integration (S3/R2/Vercel Blob)

**Storage Setup:**
- ⏳ **Blob Storage Configuration** (See Phase 8.3 for complete setup)
   - Must be completed before implementing file uploads in brand guidelines
   - Reference: Phase 8.3 - Blob Storage Configuration
   - Reference: Notion task ID `2d557c77-ca86-8109-a314-cbb09e743ebc`
   - Story Points: 2

---

## Phase 8: Infrastructure & Optimization (Week 4-5)

### 8.1 Caching & Performance

**Priority:** MEDIUM  
**Status:** Not Started

#### Tasks:
1. ⏳ **Install Redis client (Upstash / ioredis) / Render Redis** (Active - Sprint 1, moved from Hold)
   - Choose provider: Upstash (serverless, recommended) or Render Redis
   - Install package: `@upstash/redis` or `ioredis`
   - Configure connection in `lib/redis.ts`
   - Add Redis URL to environment variables
   - Test connection
   - Reference: Notion task ID `2d557c77-ca86-810e-846d-cbcf2d440cfc`
   - Story Points: 2
   - Epic: EPIC 1 — Initial Setup & Foundations
   - Area: redis
   - Files: `lib/redis.ts`, `env.js`

2. ⏳ **Add Redis rate limiter** (Active - Sprint 1, moved from Hold)
   - Implement rate limiting middleware using Redis
   - Configure rate limits per endpoint/user
   - Add to RPC router middleware
   - Handle rate limit exceeded responses
   - Reference: Notion task ID `2d557c77-ca86-8150-b1f2-f7157e6a007f`
   - Story Points: 2
   - Epic: EPIC 1 — Initial Setup & Foundations
   - Area: redis
   - Reference: `docs/Backend_Implementation_TODOs.md` lines 1808-1834
   - Files: `lib/rate-limiter.ts`, `lib/rpc/router.ts`

3. ⏳ **Implement caching layer**
   - Dashboard stats: 2-minute TTL
   - Performance charts: 5-15 minute TTL
   - Request lists: 2-minute TTL
   - Request by ID: 5-minute TTL
   - Cache invalidation on updates
   - Reference: `docs/Backend_Implementation_TODOs.md` lines 1662-1724

4. ⏳ **Create dashboard_stats_cache table**
   - Pre-aggregated statistics
   - Hourly updates via scheduled job
   - Reference: `docs/Backend_Implementation_TODOs.md` lines 206-270

---

### 8.2 Security & Validation

**Priority:** HIGH  
**Status:** Partially Done

#### Tasks:
1. ✅ **Install Zod validation** (Done - Sprint 1)
2. ✅ **Configure CORS & CSP** (Done - Sprint 1)
3. ✅ **Configure Vercel project & environment variables** (Done - Sprint 1)
   - Vercel project configured
   - Environment variables set up
   - Reference: Notion task ID `2d557c77-ca86-81fe-9ba7-db0318001a6d`
   - Story Points: 3
   - Epic: DevOps
4. ⏳ **Add input sanitization** (Priority 1 - Critical)
   - XSS protection
   - SQL injection prevention (use parameterized queries) - ✅ Already protected via Drizzle ORM
   - Sanitize user input before storage
   - Use DOMPurify for rich text content
   - Reference: `docs/Backend_Implementation_TODOs.md` lines 1787-1804
   - **Security Issue:** Identified in Admin Architecture Test Report

5. ⏳ **Implement comprehensive error handling** (Priority 2)
   - Standardized error response format
   - Error codes (AUTH_001, VAL_001, BIZ_001, etc.)
   - Return generic error messages to clients (prevent information leakage)
   - Log detailed errors server-side only
   - Reference: `docs/Backend_Implementation_TODOs.md` lines 1556-1608
   - **Security Issue:** Error messages may leak sensitive information

6. ⏳ **Add security headers** (Priority 2)
   - HSTS, X-Frame-Options, CSP, etc.
   - Reference: `docs/Backend_Implementation_TODOs.md` lines 1848-1859

7. ⏳ **Add input validation with Zod schemas** (Priority 1 - Critical)
   - Implement Zod schemas for all API endpoints
   - Validate email formats
   - Validate string lengths (min/max)
   - Validate required fields
   - Sanitize search parameters
   - **Security Issue:** Missing validation on most endpoints (Admin Architecture Test Report)
   - **Files to Update:**
     - `app/api/admin/advertisers/route.ts` - Add validation for create/update
     - `app/api/admin/publishers/route.ts` - Add validation for create/update
     - `app/api/admin/offers/route.ts` - Add validation for create/update
     - `app/api/admin/requests/[id]/reject/route.ts` - Add validation for reason field
   - **Example Schema:**
     ```typescript
     const createAdvertiserSchema = z.object({
       name: z.string().min(1).max(255).trim(),
       contactEmail: z.string().email().optional().or(z.literal("")),
     });
     ```

8. ⏳ **Implement rate limiting** (Priority 2)
   - Add rate limiting middleware to all API routes
   - Different limits for different endpoints
   - Per-user and per-IP limits
   - Use Redis for rate limiting (Phase 8.1)
   - **Security Issue:** No rate limiting implemented (Admin Architecture Test Report)
   - **Reference:** `docs/Backend_Implementation_TODOs.md` lines 1806-1834

9. ⏳ **Secure admin seed endpoint** (Priority 1 - Critical)
   - Add authentication check to `/api/admin/seed`
   - Or restrict to development environment only
   - **Security Issue:** No authentication - anyone can create admin users (CRITICAL)
   - **File:** `app/api/admin/seed/route.ts`
   - **Fix:**
     ```typescript
     export async function POST() {
       const session = await auth.api.getSession({ headers: await headers() });
       if (!session || session.user.role !== "admin") {
         return Response.json({ error: "Unauthorized" }, { status: 401 });
       }
       // ... rest of code
     }
     ```

10. ⏳ **Fix client/server boundary issues** (Priority 1)
    - Replace server service imports in client components:
      - `NewOfferManuallyModal.tsx` - Use `fetchAdvertisers` from `advertisers.client.ts`
      - `AdvertiserDetailsModal.tsx` - Use `getAdvertiser` from `advertisers.client.ts`
      - `BulkEditModal.tsx` - Create `bulkUpdateOffers` in `offers.client.ts` or use individual updates
    - **Build Issue:** Server-only imports in client components prevent build
    - **Reference:** Admin Architecture Test Report - Build Errors section

---

### 8.1 Publisher Form Upload Structure (Priority Implementation)

**Priority:** HIGH  
**Status:** Not Started  
**Reference:** `docs/UPLOAD_BACKEND_STRUCTURE.md`

#### Overview
This phase implements the upload backend structure for publisher form creative file uploads, including single files, ZIP archives, and smart detection. This is the first upload implementation priority.

#### Tasks:

1. ⏳ **Create file_uploads database table**
   - Add schema to `lib/schema.ts`
   - Fields: id, original_name, stored_name, mime_type, size, url, storage_key, storage_provider, uploaded_by, entity_type, entity_id, created_at, updated_at
   - **Important**: `entity_type` should support: `"creative_request"` (for publisher form uploads), `"offer"`, `"advertiser"`, `"publisher"`, `"creative"`
   - **Publisher Form Uploads**: Link files to `creative_requests` table via `entity_type: "creative_request"` and `entity_id: creativeRequestId`
   - **Note**: Publisher data is stored in separate `publishers` table (see Phase 10.6.1), but publisher form uploads link to `creative_requests` table
   - Create indexes: uploaded_by, entity (type + id), created_at
   - Run Drizzle migration
   - Reference: `docs/UPLOAD_BACKEND_STRUCTURE.md` Database Schema section

2. ⏳ **Install and configure blob storage SDK**
   - Options: Vercel Blob (for testing), AWS S3, Cloudflare R2
   - Install Vercel Blob: `pnpm add @vercel/blob`
   - For S3: `pnpm add @aws-sdk/client-s3`
   - For R2: Use S3-compatible API with `@aws-sdk/client-s3`
   - Recommended: Start with Vercel Blob for development, migrate to S3/R2 for production
   - Get `BLOB_READ_WRITE_TOKEN` from Vercel Dashboard → Storage → Blob
   - Reference: Notion task ID `2d557c77-ca86-8109-a314-cbb09e743ebc`
   - Story Points: 2
   - Epic: EPIC 1 — Initial Setup & Foundations
   - Area: storage
   - Files: `package.json`, `lib/storage.ts`
   - Vercel Blob API: `import { put, del, head } from "@vercel/blob"`

3. ⏳ **Set up storage provider abstraction layer**
   - Create `lib/storage.ts` - Main storage service
   - Create `lib/storage/providers/base.ts` - Base interface
   - Create `lib/storage/providers/vercel-blob.ts` - Vercel Blob implementation
   - Create `lib/storage/providers/s3.ts` - AWS S3 implementation (optional)
   - Create `lib/storage/providers/r2.ts` - Cloudflare R2 implementation (optional)
   - Functions: `uploadFile()`, `deleteFile()`, `getFileUrl()`, `generatePresignedUrl()`
   - Support multiple providers with easy switching
   - Reference: `docs/UPLOAD_BACKEND_STRUCTURE.md` Storage Architecture section

4. ⏳ **Configure environment variables**
   - Add to `env.js`:
     * `BLOB_STORAGE_PROVIDER` (vercel | s3 | r2)
     * `BLOB_STORAGE_URL` (for Vercel Blob)
     * `BLOB_READ_WRITE_TOKEN` (for Vercel Blob)
     * `AWS_S3_BUCKET_NAME` (for S3)
     * `AWS_S3_REGION` (for S3)
     * `AWS_ACCESS_KEY_ID` (for S3)
     * `AWS_SECRET_ACCESS_KEY` (for S3)
     * `R2_ACCOUNT_ID` (for R2)
     * `R2_ACCESS_KEY_ID` (for R2)
     * `R2_SECRET_ACCESS_KEY` (for R2)
     * `R2_BUCKET_NAME` (for R2)
     * `MAX_FILE_SIZE_MB` (default: 50)
   - Update `env.js` validation schema
   - Reference: `docs/UPLOAD_BACKEND_STRUCTURE.md` Environment Variables section

5. ⏳ **Create file validation utilities**
   - Create `lib/storage/utils/file-validation.ts`
   - Validate file type (allowed extensions: .html, .htm, .zip, .png, .jpg, .jpeg)
   - Validate file size (max 50MB for single, 100MB for ZIP)
   - Validate MIME types
   - Return structured validation results
   - Reference: `docs/UPLOAD_BACKEND_STRUCTURE.md` Implementation Structure section

6. ⏳ **Create filename sanitization utility**
   - Create `lib/storage/utils/filename-sanitizer.ts`
   - Sanitize filenames to prevent path traversal
   - Remove special characters
   - Generate safe storage paths
   - Reference: `docs/UPLOAD_BACKEND_STRUCTURE.md` Best Practices section

7. ⏳ **Create ZIP extraction utilities**
   - Create `lib/storage/utils/zip-extractor.ts`
   - Extract ZIP archive contents
   - Filter creative files (HTML, images only)
   - Analyze ZIP structure for smart detection
   - Detect single creative vs multiple creatives
   - Count assets (images, CSS, JS) in ZIP
   - Reference: `docs/UPLOAD_BACKEND_STRUCTURE.md` File Upload Flow section

8. ⏳ **Create preview generation utilities**
   - Create `lib/storage/utils/preview-generator.ts`
   - Generate preview URLs for images
   - Handle thumbnail generation (optional)
   - Return preview metadata
   - Reference: `docs/UPLOAD_BACKEND_STRUCTURE.md` Implementation Structure section

9. ⏳ **Implement POST /api/upload endpoint**
   - Create `app/api/upload/route.ts`
   - Accept multipart/form-data with file
   - Support `smartDetection` parameter for ZIP files
   - Support optional `creativeRequestId` parameter to link file to creative request
   - Validate file (type, size)
   - Upload to storage provider
   - Generate preview URL (if image)
   - Save metadata to database with `entity_type: "creative_request"` and `entity_id: creativeRequestId` (if provided)
   - If no `creativeRequestId` provided, use `entity_type: "creative"` (standalone file)
   - Return file metadata with optional zipAnalysis
   - Error handling: 400 (validation), 401 (unauthorized), 413 (too large), 500 (server error)
   - Reference: `docs/UPLOAD_BACKEND_STRUCTURE.md` API Endpoints section
   - Frontend expects: `features/publisher/components/form/_steps/CreativeDetails.tsx` line 174
   - **Note**: Publisher form uploads should link to `creative_requests` table when the request is created

10. ⏳ **Implement POST /api/upload-zip endpoint**
    - Create `app/api/upload-zip/route.ts`
    - Accept multipart/form-data with ZIP file
    - Validate ZIP file format
    - Extract all files from archive
    - Filter creative files (HTML, images)
    - For each extracted file:
      - Upload to storage
      - Generate previews for images
      - Save metadata to database with `status = "pending_scan"` (MANDATORY)
      - Enqueue malware scan background job (MANDATORY)
    - Return array of file metadata (all with `status: "pending_scan"`)
    - Error handling: 400 (invalid ZIP), 401 (unauthorized), 413 (too large), 429 (rate limit), 500 (server error)
    - Reference: `docs/UPLOAD_BACKEND_STRUCTURE.md` API Endpoints section
    - Frontend expects: `features/publisher/components/form/_steps/CreativeDetails.tsx` line 242
    - **Security**: All extracted files MUST start in `pending_scan` status

11. ⏳ **Implement file metadata service**
    - Create `lib/services/file-upload.service.ts`
    - Business logic for file operations
    - Database operations for file_uploads table
    - Link files to entities:
      - **Publisher form uploads**: Link to `creative_requests` table (`entity_type: "creative_request"`, `entity_id: creativeRequestId`)
      - **Brand guidelines**: Link to `offers`, `advertisers`, or `publishers` tables
      - **Standalone creatives**: Use `entity_type: "creative"` until linked to a request
    - Track file usage and references
    - Query files by entity type and ID
    - Enforce file status rules (only `clean` files are usable)
    - Reference: `docs/UPLOAD_BACKEND_STRUCTURE.md` Implementation Structure section
    - **Note**: Remember publisher data is in separate `publishers` table, but publisher form uploads link to `creative_requests`

12. ⏳ **Implement malware scan background job**
    - Create background job type: `scan_file`
    - Job payload: `{ fileId: string }`
    - Job flow:
      1. Fetch file from storage using `storageKey`
      2. Download file content
      3. Run malware scan (integrate with scanning service)
      4. Update `file_uploads.status` to `"clean"` or `"infected"`
      5. Update `file_uploads.scanned_at` timestamp
      6. Save `scan_result` JSON with scan details
      7. If infected: Trigger admin alert via `sendAlert()`
      8. If infected: Log security event
    - Error handling:
      - Scan failures → Retry with exponential backoff, keep status as `"pending_scan"`
      - Timeout → Keep status as `"pending_scan"` (retryable, not `"clean"`)
      - Max retries → Alert admin, keep status as `"pending_scan"` (manual intervention required)
      - **Note**: There is no "failed" status - all scan failures remain `pending_scan` for retry
    - Integration:
      - Enqueue scan job after file upload (in upload endpoints)
      - Use existing background job infrastructure (`background_jobs` table)
      - Reference: `docs/UPLOAD_BACKEND_STRUCTURE.md` Malware Scanning section
    - **Note**: This is MANDATORY - all uploaded files must be scanned before use

13. ⏳ **Implement GET /api/admin/files/:id endpoint**
    - Create `app/api/admin/files/[id]/route.ts`
    - Get file metadata by ID
    - Return file information and entity references
    - Check authentication and authorization
    - Error handling: 401 (unauthorized), 403 (forbidden), 404 (not found)
    - Reference: `docs/UPLOAD_BACKEND_STRUCTURE.md` API Endpoints section

14. ⏳ **Implement DELETE /api/admin/files/:id endpoint**
    - Create `app/api/admin/files/[id]/route.ts` (DELETE method)
    - Check if file is referenced by entities
    - Delete from storage provider
    - Remove from database
    - Log deletion in audit trail
    - Error handling: 401 (unauthorized), 403 (forbidden), 404 (not found), 409 (in use)
    - Reference: `docs/UPLOAD_BACKEND_STRUCTURE.md` API Endpoints section

15. ⏳ **Add security and validation**
    - Authentication required for all upload endpoints
    - Authorization checks (admin for file management)
    - Rate limiting for upload endpoints
    - CORS configuration
    - File type whitelist validation
    - Filename sanitization
    - Path traversal prevention
    - Reference: `docs/UPLOAD_BACKEND_STRUCTURE.md` Best Practices section

16. ⏳ **Add error handling and logging**
    - Structured error responses
    - Log all upload operations
    - Track upload metrics (success/failure rates)
    - Handle storage provider failures gracefully
    - Retry logic for transient failures
    - Reference: `docs/UPLOAD_BACKEND_STRUCTURE.md` Best Practices section

17. ⏳ **Add monitoring and testing**
    - Unit tests for file validation
    - Unit tests for filename sanitization
    - Unit tests for ZIP extraction
    - Integration tests for upload endpoints
    - Load tests with large files
    - Error scenario testing
    - Upload metrics tracking
    - Reference: `docs/UPLOAD_BACKEND_STRUCTURE.md` Best Practices section

**Use Cases:**
- Publisher form creative file uploads (HTML, images)
- ZIP archive uploads with automatic extraction
- Smart detection of single creative in ZIP
- Bulk creative uploads from ZIP archives
- File metadata tracking and management

**Files to Create:**
- `lib/schema.ts` - Add `file_uploads` table
- `lib/storage.ts` - Main storage service
- `lib/storage/providers/base.ts` - Base provider interface
- `lib/storage/providers/vercel-blob.ts` - Vercel Blob provider
- `lib/storage/providers/s3.ts` - S3 provider (optional)
- `lib/storage/providers/r2.ts` - R2 provider (optional)
- `lib/storage/utils/file-validation.ts` - File validation
- `lib/storage/utils/filename-sanitizer.ts` - Filename sanitization
- `lib/storage/utils/zip-extractor.ts` - ZIP extraction
- `lib/storage/utils/preview-generator.ts` - Preview generation
- `lib/services/file-upload.service.ts` - File upload business logic
- `app/api/upload/route.ts` - Single file upload endpoint
- `app/api/upload-zip/route.ts` - ZIP upload endpoint
- `app/api/admin/files/[id]/route.ts` - File metadata and deletion

**Implementation Notes:**
- Start with Vercel Blob for development/testing (easiest setup)
- Design abstraction layer to switch providers easily
- Support streaming uploads for large files
- Generate preview URLs automatically for images
- Implement smart ZIP detection (single creative vs multiple)
- Track file references to prevent orphaned files
- Consider CDN integration for file delivery
- Add file expiration/cleanup policies for temporary uploads

**Mandatory System Behavior:**
- All files MUST start with `status = "pending_scan"` (never `"clean"` immediately)
- Malware scan background job MUST be enqueued for every upload
- Only files with `status = "clean"` are usable/attachable
- All deletions MUST use soft delete (`deleted_at` timestamp)
- Files with `status = "infected"` MUST trigger alerts and be quarantined
- Scan failures MUST default to `"pending_scan"` (retryable), NEVER `"clean"`

**Dependencies:**
- Must be completed before publisher form can accept file uploads
- Foundation for Phase 8.2 (Brand Guidelines Uploads)
- Can be done in parallel with Phase 5-6 if not blocking

**Reference Documentation:**
- Complete structure: `docs/UPLOAD_BACKEND_STRUCTURE.md`
- Frontend implementation: `features/publisher/components/form/_steps/CreativeDetails.tsx`
- Frontend upload modal: `features/publisher/view-models/fileUploadModal.viewModel.ts`

---

### 8.2 Brand Guidelines Upload Structure

**Priority:** HIGH  
**Status:** Not Started  
**Dependencies:** Requires Phase 8.1 (Publisher Form Upload Structure) to be completed first

#### Overview
This phase implements brand guidelines upload functionality for offers, advertisers, and publishers. It builds on the storage infrastructure from Phase 8.1.

#### Tasks:

1. ⏳ **Create brand_guidelines database table (optional enhancement)**
   - Add schema to `lib/schema.ts`
   - Fields: id, entity_type, entity_id, type (url/file/text), url, file_id, text, notes, updated_by, created_at, updated_at
   - Create indexes: entity (type + id), file_id
   - Run Drizzle migration
   - Reference: `docs/UPLOAD_BACKEND_STRUCTURE.md` Database Schema section

2. ⏳ **Implement brand guidelines validation**
   - Extend file validation for brand guidelines
   - Allowed types: .doc, .docx, .pdf
   - Max size: 10MB
   - URL validation (HTTPS only)
   - Text content sanitization
   - Reference: `docs/UPLOAD_BACKEND_STRUCTURE.md` API Endpoints section

3. ⏳ **Implement PUT /api/admin/offers/:id/brand-guidelines endpoint**
   - Create `app/api/admin/offers/[id]/brand-guidelines/route.ts`
   - Support file upload (multipart/form-data)
   - Support URL (application/json)
   - Support text (application/json)
   - Validate entity exists
   - If file: upload to storage, save metadata
   - If replacing file: delete old file from storage
   - Update database with brand guidelines
   - Log update in audit trail
   - Error handling: 400 (validation), 401 (unauthorized), 403 (forbidden), 404 (not found), 413 (too large)
   - Reference: `docs/UPLOAD_BACKEND_STRUCTURE.md` API Endpoints section
   - Frontend expects: `features/admin/components/BrandGuidelinesModal.tsx` line 294

4. ⏳ **Implement PUT /api/admin/advertisers/:id/brand-guidelines endpoint**
   - Create `app/api/admin/advertisers/[id]/brand-guidelines/route.ts`
   - Same implementation as offers endpoint
   - Reference: `docs/UPLOAD_BACKEND_STRUCTURE.md` API Endpoints section

5. ⏳ **Implement PUT /api/admin/publishers/:id/brand-guidelines endpoint**
   - Create `app/api/admin/publishers/[id]/brand-guidelines/route.ts`
   - Same implementation as offers endpoint
   - Reference: `docs/UPLOAD_BACKEND_STRUCTURE.md` API Endpoints section

6. ⏳ **Create brand guidelines service**
   - Create `lib/services/brand-guidelines.service.ts`
   - Business logic for brand guidelines operations
   - Database operations for brand_guidelines table
   - File replacement logic
   - Reference: `docs/UPLOAD_BACKEND_STRUCTURE.md` Implementation Structure section

**Use Cases:**
- Brand guidelines file uploads (offers, advertisers, publishers)
- Brand guidelines URL links
- Brand guidelines text content
- Updating/replacing existing brand guidelines

**Files to Create:**
- `lib/schema.ts` - Add `brand_guidelines` table (optional)
- `lib/services/brand-guidelines.service.ts` - Brand guidelines business logic
- `app/api/admin/offers/[id]/brand-guidelines/route.ts` - Offers brand guidelines
- `app/api/admin/advertisers/[id]/brand-guidelines/route.ts` - Advertisers brand guidelines
- `app/api/admin/publishers/[id]/brand-guidelines/route.ts` - Publishers brand guidelines

**Implementation Notes:**
- Reuse storage infrastructure from Phase 8.1
- Support three types: file, URL, text
- Handle file replacement (delete old file)
- Validate entity exists before updating
- Log all brand guidelines updates

**Dependencies:**
- Requires Phase 8.1 (Publisher Form Upload Structure) to be completed
- Must be completed before Phase 7 (Brand Guidelines Management) can use file uploads

**Reference Documentation:**
- Complete structure: `docs/UPLOAD_BACKEND_STRUCTURE.md`
- Frontend implementation: `features/admin/components/BrandGuidelinesModal.tsx`

---

### 8.3 Blob Storage Configuration (Legacy - Consolidated into Phase 8.1)

**Priority:** HIGH  
**Status:** Consolidated into Phase 8.1

**Note:** This section has been consolidated into Phase 8.1 (Publisher Form Upload Structure). The storage configuration, provider abstraction, and file upload infrastructure are now part of the publisher form upload implementation.

---

## Phase 9: Advanced Features (Week 5-6)

### 9.1 Notification System

**Priority:** MEDIUM  
**Status:** Not Started

#### Tasks:
1. ⏳ **Create notifications table schema**
   - Reference: `docs/Backend_Implementation_TODOs.md` lines 2239-2258

2. ⏳ **Implement notification APIs**
   - GET /api/notifications
   - GET /api/notifications/unread-count
   - PATCH /api/notifications/:id/read
   - PATCH /api/notifications/read-all
   - DELETE /api/notifications/:id
   - Reference: `docs/Backend_Implementation_TODOs.md` lines 2260-2286

3. ⏳ **WebSocket/SSE for real-time notifications**
   - WebSocket endpoint: /ws/notifications
   - Real-time push on events
   - Reference: `docs/Backend_Implementation_TODOs.md` lines 2288-2308

4. ⏳ **Notification triggers**
   - Request approved → notify advertiser
   - Request rejected → notify publisher
   - Response approved → notify admin & publisher
   - Reference: `docs/Backend_Implementation_TODOs.md` lines 2310-2321

---

### 9.2 Error Tracking & Monitoring

**Priority:** MEDIUM  
**Status:** Not Started

#### Tasks:
1. ⏳ **Create error_logs table**
   - Reference: `docs/Backend_Implementation_TODOs.md` lines 2339-2362

2. ⏳ **Implement error logging APIs**
   - POST /api/admin/errors/log
   - GET /api/admin/errors
   - PATCH /api/admin/errors/:id/resolve
   - Reference: `docs/Backend_Implementation_TODOs.md` lines 2364-2382

3. ⏳ **Health check endpoint**
   - GET /api/health (already exists in RPC router)
   - Enhance with database/Redis checks
   - Reference: `docs/Backend_Implementation_TODOs.md` lines 2063-2105

4. ⏳ **Sentry integration**
   - Forward critical errors
   - Reference: Notion task "Install Sentry SDK for Next.js"

---

### 9.3 Real-time Updates

**Priority:** LOW  
**Status:** Not Started

#### Tasks:
1. ⏳ **WebSocket /ws/updates endpoint**
   - Real-time entity updates
   - Reference: `docs/Backend_Implementation_TODOs.md` lines 2392-2413

2. ⏳ **SSE /api/updates/stream endpoint**
   - Alternative to WebSocket
   - Reference: `docs/Backend_Implementation_TODOs.md` lines 2415-2422

---

## Phase 10: Compliance Model Integration (Pending Deployment)

**Priority:** HIGH  
**Status:** Blocked - Waiting for Model Deployment  
**Reference:** [ACGCS Data Flow Diagram](https://www.figma.com/board/iveLxWPjyCSFJgO6CM344t/ACGCS-Data-Flow-Diagram?node-id=0-1&p=f&t=p1fMpETCU8AM8J4U-0)

### Overview

This phase covers integration with the AI/LLM compliance checking model that validates creative assets (PDFs, images, HTML) against brand guidelines. The model uses OCR, text extraction, pattern matching, fuzzy matching, and semantic similarity to check for compliance violations.

**Model Status:** Not deployed yet - Integration will proceed after deployment

### 10.1 Database Schema for Compliance Results

**Priority:** HIGH  
**Status:** Can Start Now (Preparation)

#### Tasks:
1. ⏳ **Create compliance_results table schema**
   - Fields:
     * `id` - Primary key
     * `creative_request_id` - FK to creative_requests
     * `status` - "pass" | "fail"
     * `violations` - JSON array of violation objects
     * `checked_at` - Timestamp
     * `model_version` - Version of compliance model used
     * `input_type` - "pdf" | "image" | "html_file" | "html_string"
     * `processing_time_ms` - How long the check took
     * `error_message` - If model API failed
   - Add to `lib/schema.ts`
   - Create migration

2. ⏳ **Create compliance_violations table (optional - normalized)**
   - If we want to normalize violations:
     * `id` - Primary key
     * `compliance_result_id` - FK to compliance_results
     * `rule_type` - "prohibited_text" | "fuzzy_text_match" | "prohibited_semantic_claim" | "required_text" | "prohibited_calendar_reference"
     * `rule_value` - The rule that was violated
     * `matched_text` - Text that triggered the violation
     * `confidence` - Confidence score (for semantic matches)
     * `location` - Where in the creative (bbox coordinates, page number, etc.)
   - Add to `lib/schema.ts`
   - Create migration

3. ⏳ **Create and run database migrations for compliance tables**
   - Add compliance_results and compliance_violations table definitions to `lib/schema.ts`
   - Include all fields from Phase 10.6.2 updates (publisher_id, advertiser_id, usage_type, checked_by_role, credit fields)
   - Generate migration: `pnpm drizzle-kit generate` or `npx drizzle-kit generate`
   - Review migration file in `drizzle/migrations/XXXXXX_create_compliance_results.sql`
   - Run migration: `pnpm drizzle-kit migrate` or `npx drizzle-kit migrate`
   - Verify tables created in NeonDB
   - Test: Insert test compliance result, verify constraints work

**Files to Create/Update:**
- `lib/schema.ts` - Add compliance tables with all fields
- `drizzle/migrations/XXXXXX_create_compliance_results.sql` - Migration file (auto-generated)
- `drizzle/migrations/XXXXXX_create_compliance_violations.sql` - Migration file (auto-generated, if normalized)
- Run migrations to create tables in database

---

### 10.2 API Structure & Integration Points

**Priority:** HIGH  
**Status:** Can Start Now (Preparation)

#### Tasks:
1. ⏳ **Design compliance check RPC procedure structure**
   - Procedure: `admin.compliance.check`
   - Input:
     * `creativeRequestId` - ID of the creative request
     * `inputType` - "pdf" | "image" | "html_file" | "html_string"
     * `fileUrl` - URL to the creative file (from blob storage)
     * `guidelinesUrl` - URL to brand guidelines PDF (from blob storage)
   - Output: `ComplianceResponse`
     * `status: "pass" | "fail"`
     * `violations: Array<Violation>`
     * `checkedAt: timestamp`
     * `processingTimeMs: number`

2. ⏳ **Define TypeScript types for compliance**
   - Create `lib/types/compliance.types.ts`
   - Types:
     * `ComplianceResponse`
     * `Violation`
     * `RuleType` enum
     * `InputType` enum

3. ⏳ **Identify integration points in workflow**
   - When creative is submitted by publisher → trigger compliance check
   - When creative is updated → re-run compliance check
   - When brand guidelines are updated → re-check all related creatives
   - Manual compliance check trigger (admin action)

**Files to Create:**
- `lib/types/compliance.types.ts` - Type definitions
- `lib/rpc/procedures/admin/compliance.ts` - RPC procedure (stub initially)

---

### 10.3 Compliance Service Wrapper (Preparation)

**Priority:** MEDIUM  
**Status:** Can Start Now (Preparation)

#### Tasks:
1. ⏳ **Create compliance service wrapper**
   - Create `lib/services/compliance.service.ts`
   - Abstract the model API calls
   - Functions:
     * `checkCompliance(inputType, fileUrl, guidelinesUrl): Promise<ComplianceResponse>`
     * `handleModelError(error): ComplianceResponse` - Fallback on API failure
   - Use environment variables for model API URL/keys

2. ⏳ **Add environment variables to env.js**
   - `COMPLIANCE_MODEL_API_URL` - Model API endpoint (placeholder for now)
   - `COMPLIANCE_MODEL_API_KEY` - Authentication key
   - `COMPLIANCE_MODEL_TIMEOUT_MS` - Request timeout (default: 30000)
   - `COMPLIANCE_MODEL_ENABLED` - Feature flag (default: false)

3. ⏳ **Implement error handling & retry logic**
   - Handle model API failures gracefully
   - Retry logic (exponential backoff)
   - Fallback behavior (mark as "pending" or "error")
   - Logging for debugging

4. ⏳ **Create stub/mock implementation**
   - For development/testing before model is deployed
   - Return mock compliance responses
   - Allow testing the integration flow

**Files to Create:**
- `lib/services/compliance.service.ts` - Service wrapper
- `lib/services/compliance.mock.ts` - Mock implementation for testing
- `env.js` - Add compliance model environment variables

---

### 10.4 Model API Integration (Blocked - After Deployment)

**Priority:** HIGH  
**Status:** BLOCKED - Waiting for Model Deployment

#### Prerequisites (from model team):
- ✅ Model API endpoint URL
- ✅ Authentication method (API key, OAuth, etc.)
- ✅ Request/response format documentation
- ✅ Rate limits and quotas
- ✅ Expected response times
- ✅ Error response format

#### Tasks (to be completed after deployment):
1. ⏳ **Implement actual model API client**
   - Replace stub with real API calls
   - Handle authentication
   - Implement request/response mapping
   - Update `lib/services/compliance.service.ts`

2. ⏳ **Implement file upload to model API**
   - Upload creative files to model API
   - Upload brand guidelines PDF
   - Handle file size limits
   - Handle upload errors

3. ⏳ **Parse and normalize model responses**
   - Map model response to `ComplianceResponse` format
   - Normalize violation types
   - Extract confidence scores
   - Extract location data (bboxes, page numbers)

4. ⏳ **Add rate limiting & queuing**
   - Respect model API rate limits
   - Implement request queuing if needed
   - Handle concurrent requests
   - Use Redis for rate limiting

5. ⏳ **Add caching layer**
   - Cache compliance results (same file + same guidelines = same result)
   - Cache key: hash(fileUrl + guidelinesUrl)
   - TTL: 24 hours (or until guidelines updated)
   - Invalidate cache when guidelines change

6. ⏳ **Integration testing**
   - Test with real model API
   - Test all input types (PDF, image, HTML file, HTML string)
   - Test error scenarios
   - Test rate limiting
   - Test caching

**Files to Update:**
- `lib/services/compliance.service.ts` - Replace stub with real implementation
- `lib/rpc/procedures/admin/compliance.ts` - Complete implementation

---

### 10.5 Workflow Integration

**Priority:** HIGH  
**Status:** Can Start Planning (Implementation after model deployment)

#### Tasks:
1. ⏳ **Integrate compliance check into creative submission flow**
   - When publisher submits creative → automatically run compliance check
   - Store results in database
   - Update creative request status based on compliance

2. ⏳ **Add compliance status to creative requests**
   - Add `compliance_status` field to creative_requests table
   - Values: "pending" | "pass" | "fail" | "error"
   - Add `compliance_result_id` FK

3. ⏳ **Add compliance re-check triggers**
   - When brand guidelines updated → re-check all related creatives
   - When creative file updated → re-run compliance check
   - Manual re-check action (admin)

4. ⏳ **Add compliance results to admin dashboard**
   - Show compliance status in creative request list
   - Show violations in creative detail view
   - Filter by compliance status
   - Statistics: pass/fail rates

5. ⏳ **Add compliance notifications**
   - Notify advertiser when compliance check fails
   - Notify publisher when compliance issues found
   - Reference: Phase 9.1 - Notification System

**Files to Update:**
- `lib/schema.ts` - Add compliance_status to creative_requests
- `lib/rpc/procedures/admin/requests.ts` - Add compliance check triggers
- `lib/rpc/procedures/admin/compliance.ts` - Re-check procedures

---

### Model Flow Reference

Based on the [ACGCS Data Flow Diagram](https://www.figma.com/board/iveLxWPjyCSFJgO6CM344t/ACGCS-Data-Flow-Diagram?node-id=0-1&p=f&t=p1fMpETCU8AM8J4U-0):

**Input Processing:**
- PDF: Extract text → Parse rules → Structured rules list
- Image: OCR text extraction
- HTML: DOM extraction → Screenshot → OCR

**Text Normalization:**
- Merge extracted texts
- Lowercase & strip
- Deduplicate
- Remove overlapping bboxes

**Rule Engine:**
- Exact text match (regex) - prohibited_text
- Fuzzy text match (SequenceMatcher) - fuzzy_text_match
- Semantic classification (Sentence Transformer + Cosine Similarity) - prohibited_semantic_claim
- Required text check - required_text
- Date/calendar pattern match - prohibited_calendar_reference

**Output:**
- Status: "pass" | "fail"
- Violations list with details

---

### Dependencies

**Must Complete Before:**
- Phase 7 (Brand Guidelines) - Need guidelines storage
- Phase 4 (Requests/Responses) - Need creative request structure
- Phase 8.3 (Blob Storage) - Need file storage for creatives and guidelines

**Can Work In Parallel With:**
- Phase 9 (Advanced Features)
- Phase 11 (Grammar Correction)
- Phase 13 (Testing)

---

### 10.6 Credit System Integration (Unlimited Mode)

**Priority:** HIGH  
**Status:** Can Start Now (Implementation with Unlimited Credits)

**Note:** Credit system will be implemented now but with unlimited credits enabled. Enforcement will be enabled when Publisher Portal v2 launches (2 years). This allows us to track usage data and have the system ready for future enforcement.

#### Overview

Credit system tracks usage of compliance and grammar model API calls. **Separate credit pools for Publishers and Advertisers** - they are completely independent. Publishers and Advertisers can use AI tools standalone (without submissions) or tied to creative requests. Admin Portal acts as the central API gateway for all AI checks from Publisher Form, Advertiser Portal, and Admin Portal.

**Key Points:**
- **Publishers:** Submit creatives, use AI for submissions or standalone
- **Advertisers:** Never submit creatives, only check forwarded creatives from admin, can use AI standalone
- **Separate Credits:** Publisher credits and Advertiser credits are completely separate
- **AI-Only Usage:** Track AI usage even when no creative submission (standalone usage)
- **Current Mode:** Unlimited credits (tracking only, no enforcement)
- **Future Mode:** Credit enforcement when Publisher Portal v2 launches

#### 10.6.1 Database Schema for Publishers

**Priority:** HIGH  
**Status:** Can Start Now

**Note:** Publishers are created automatically on first AI usage (compliance or grammar check), even if they don't submit creatives.

#### Tasks:
1. ⏳ **Create publishers table schema**
   - Fields from Publisher Form (Step 1 & 2):
     * `id` - Primary key (uuid)
     * `affiliate_id` - String (required, unique) - Primary identifier from form
     * `company_name` - String (required)
     * `first_name` - String (required)
     * `last_name` - String (required)
     * `email` - String (required, unique)
     * `telegram_id` - String (nullable, optional)
   - Tracking fields:
     * `first_seen_at` - Timestamp (when first used credits/AI)
     * `created_at` - Timestamp
     * `updated_at` - Timestamp
     * `last_activity_at` - Timestamp (last credit usage)
   - Status fields:
     * `status` - Enum: 'active' | 'inactive' (default: 'active')
     * `source` - Enum: 'publisher_form' | 'api' | 'manual' (default: 'publisher_form')
   - Additional:
     * `metadata` - JSONB (nullable, for future fields)
   - Add to `lib/schema.ts`
   - Create migration (when Publisher Portal phase starts)
   - Indexes:
     * Unique index on `affiliate_id`
     * Unique index on `email`
     * Index on `company_name`
     * Index on `created_at`
     * Index on `status`

2. ⏳ **Publisher matching logic**
   - Match existing publishers by:
     * Priority 1: `affiliate_id` (most unique)
     * Priority 2: `email` (unique identifier)
     * Priority 3: Combination of `company_name` + `first_name` + `last_name`
   - If match found: Update `last_activity_at` and return existing publisher
   - If no match: Create new publisher record

3. ⏳ **Create and run database migration for publishers table**
   - Add publishers table definition to `lib/schema.ts`
   - Generate migration: `pnpm drizzle-kit generate` or `npx drizzle-kit generate`
   - Review migration file in `drizzle/migrations/`
   - Run migration: `pnpm drizzle-kit migrate` or `npx drizzle-kit migrate`
   - Verify table created in NeonDB
   - Test: Insert test publisher, verify constraints work

**Files to Create/Update:**
- `lib/schema.ts` - Add publishers table definition
- `drizzle/migrations/XXXXXX_create_publishers.sql` - Migration file (auto-generated)
- Run migration to create table in database

---

#### 10.6.2 Database Schema for Credit System

**Priority:** HIGH  
**Status:** Can Start Now

#### Tasks:

**Priority:** HIGH  
**Status:** Can Start Now

#### Tasks:
1. ⏳ **Create credit_accounts table schema**
   - Fields:
     * `id` - Primary key (uuid)
     * `account_type` - Enum: 'advertiser' | 'publisher' (required)
     * `advertiser_id` - FK to advertisers (nullable, only if account_type = 'advertiser')
     * `publisher_id` - FK to publishers (nullable, only if account_type = 'publisher')
     * `total_credits` - Integer (default: 999999 for unlimited)
     * `used_credits` - Integer (default: 0)
     * `available_credits` - Integer (computed: total - used)
     * `created_at` - Timestamp
     * `updated_at` - Timestamp
   - Constraints:
     * Check constraint: (advertiser_id IS NOT NULL AND publisher_id IS NULL) OR (advertiser_id IS NULL AND publisher_id IS NOT NULL)
     * Unique constraint on (account_type, advertiser_id) for advertisers
     * Unique constraint on (account_type, publisher_id) for publishers
   - Add to `lib/schema.ts`
   - Create migration (when Publisher Portal phase starts)
   - Indexes:
     * Index on `account_type`
     * Index on `advertiser_id`
     * Index on `publisher_id`
     * Unique index on (account_type, advertiser_id) where advertiser_id IS NOT NULL
     * Unique index on (account_type, publisher_id) where publisher_id IS NOT NULL

2. ⏳ **Create credit_transactions table schema**
   - Fields:
     * `id` - Primary key (uuid)
     * `credit_account_id` - FK to credit_accounts
     * `account_type` - Enum: 'advertiser' | 'publisher' (denormalized for easy querying)
     * `advertiser_id` - FK to advertisers (nullable, denormalized)
     * `publisher_id` - FK to publishers (nullable, denormalized)
     * `transaction_type` - Enum: 'allocation' | 'consumption' | 'refund' | 'adjustment' | 'expiration'
     * `amount` - Integer (positive for allocation, negative for consumption)
     * `compliance_result_id` - FK to compliance_results (nullable)
     * `grammar_result_id` - FK to grammar_results (nullable)
     * `creative_request_id` - FK to creative_requests (nullable, NULL if AI-only usage)
     * `usage_type` - Enum: 'submission' | 'forwarded_check' | 'standalone' (NEW)
       - 'submission': Publisher submitted creative (tied to submission)
       - 'forwarded_check': Advertiser checked forwarded creative from admin
       - 'standalone': AI-only usage (no creative_request)
     * `checked_by_role` - Enum: 'publisher' | 'advertiser' | 'admin' (NEW)
     * `service_type` - Enum: 'compliance' | 'grammar' (NEW)
     * `user_id` - FK to users (nullable, who triggered)
     * `description` - Text (nullable)
     * `metadata` - JSONB (nullable, additional data)
     * `created_at` - Timestamp
   - Add to `lib/schema.ts`
   - Create migration (when Publisher Portal phase starts)
   - Indexes:
     * Index on `credit_account_id`
     * Index on `account_type`
     * Index on `advertiser_id`
     * Index on `publisher_id`
     * Index on `compliance_result_id`
     * Index on `grammar_result_id`
     * Index on `creative_request_id`
     * Index on `usage_type`
     * Index on `checked_by_role`
     * Index on `service_type`
     * Index on `created_at`
     * Index on `transaction_type`

3. ⏳ **Update compliance_results table (Phase 10.1)**
   - Add `credit_account_id` - FK to credit_accounts
   - Add `credits_consumed` - Integer (default: 1)
   - Add `credit_transaction_id` - FK to credit_transactions (nullable)
   - Add `publisher_id` - FK to publishers (nullable, track publisher even without submission)
   - Add `advertiser_id` - FK to advertisers (nullable, track advertiser even without submission)
   - Add `usage_type` - Enum: 'submission' | 'forwarded_check' | 'standalone'
   - Add `checked_by_role` - Enum: 'publisher' | 'advertiser' | 'admin'
   - Add to Phase 10.1 schema definition

4. ⏳ **Update grammar_results table (Phase 11.1)**
   - Add `credit_account_id` - FK to credit_accounts
   - Add `credits_consumed` - Integer (default: 0.5)
   - Add `credit_transaction_id` - FK to credit_transactions (nullable)
   - Add `publisher_id` - FK to publishers (nullable, track publisher even without submission)
   - Add `advertiser_id` - FK to advertisers (nullable, track advertiser even without submission)
   - Add `usage_type` - Enum: 'submission' | 'forwarded_check' | 'standalone'
   - Add `checked_by_role` - Enum: 'publisher' | 'advertiser' | 'admin'
   - Add to Phase 11.1 schema definition

5. ⏳ **Create and run database migrations for credit system**
   - Add credit_accounts and credit_transactions table definitions to `lib/schema.ts`
   - Update compliance_results and grammar_results tables in schema
   - Generate migration: `pnpm drizzle-kit generate` or `npx drizzle-kit generate`
   - Review migration files in `drizzle/migrations/`:
     * `XXXXXX_create_credit_accounts.sql`
     * `XXXXXX_create_credit_transactions.sql`
     * `XXXXXX_update_compliance_results.sql`
     * `XXXXXX_update_grammar_results.sql`
   - Run migrations: `pnpm drizzle-kit migrate` or `npx drizzle-kit migrate`
   - Verify all tables created in NeonDB
   - Test: Create test credit accounts, verify constraints work
   - Test: Create test transactions, verify foreign keys work

**Files to Create/Update:**
- `lib/schema.ts` - Add credit tables and update compliance/grammar results
- `drizzle/migrations/XXXXXX_create_credit_accounts.sql` - Migration file (auto-generated)
- `drizzle/migrations/XXXXXX_create_credit_transactions.sql` - Migration file (auto-generated)
- `drizzle/migrations/XXXXXX_update_compliance_results.sql` - Migration file (auto-generated)
- `drizzle/migrations/XXXXXX_update_grammar_results.sql` - Migration file (auto-generated)
- Run migrations to create/update tables in database

---

#### 10.6.3 Publisher Service Implementation

**Priority:** HIGH  
**Status:** Can Start Now

#### Tasks:
1. ⏳ **Create publisher service**
   - Create `lib/services/publisher.service.ts`
   - Methods:
     * `createOrGetPublisher(formData)` - Create or get publisher, match by affiliate_id, email, or name combination
     * `getPublisher(publisherId)` - Get publisher by ID
     * `updatePublisher(publisherId, data)` - Update publisher details
     * `findExistingPublisher(affiliateId, email, companyName, firstName, lastName)` - Find existing publisher with matching logic
   - Matching priority:
     * Priority 1: `affiliate_id` (most unique)
     * Priority 2: `email` (unique identifier)
     * Priority 3: Combination of `company_name` + `first_name` + `last_name`
   - If match found: Update `last_activity_at` and return existing
   - If no match: Create new publisher record

2. ⏳ **Implement publisher identification from request**
   - Create `lib/utils/request-identification.ts`
   - Function: `identifyAccountType(request: Request): 'publisher' | 'advertiser'`
   - Logic:
     * Check `origin` header for 'publisher-form' or 'publisher-form-nu.vercel.app' → 'publisher'
     * Check `referer` header for 'publisher-form' → 'publisher'
     * Check `origin`/`referer` for 'advertiser' → 'advertiser'
     * Check `X-Portal-Type` header → 'publisher' | 'advertiser'
     * Default: Check authenticated user role (if no user → 'publisher')

3. ⏳ **Implement publisher form data extraction**
   - Function: `extractPublisherFormData(request: Request): PublisherFormData`
   - Extract from request body:
     * `affiliateId`, `companyName`, `firstName`, `lastName`, `email`, `telegramId`
   - Handle both form submission and API request formats

**Files to Create:**
- `lib/services/publisher.service.ts` - Publisher management service
- `lib/utils/request-identification.ts` - Request identification utilities

---

#### 10.6.4 Credit Service Implementation

**Priority:** HIGH  
**Status:** Can Start Now

#### Tasks:
1. ⏳ **Create credit service wrapper**
   - Create `lib/services/credit.service.ts`
   - Implement with feature flag support:
     * `COMPLIANCE_CREDITS_ENABLED` - Enable/disable credit system
     * `COMPLIANCE_CREDITS_UNLIMITED_MODE` - Unlimited mode (default: true)
   - Methods:
     * `checkCreditsAvailable(accountOwnerId, accountType, amount)` - Check if credits available (always true in unlimited mode)
     * `consumeCredits(creditAccountId, accountType, accountOwnerId, publisherId, advertiserId, amount, resultId, creativeRequestId, userId, usageType, checkedByRole, serviceType)` - Consume credits (track only in unlimited mode)
     * `refundCredits(resultId, reason, serviceType)` - Refund credits on API failure
     * `getAccountBalance(accountOwnerId, accountType)` - Get balance and usage stats
     * `allocateCredits(accountOwnerId, accountType, amount, allocatedBy, description)` - Admin allocation (separate for publisher/advertiser)
     * `getTransactionHistory(accountOwnerId, accountType, filters)` - Transaction history
     * `getOrCreatePublisherCreditAccount(publisherId)` - Get or create publisher credit account
     * `getOrCreateAdvertiserCreditAccount(advertiserId)` - Get or create advertiser credit account

2. ⏳ **Add environment variables to env.js**
   - `COMPLIANCE_CREDITS_ENABLED` (default: true)
   - `COMPLIANCE_CREDITS_UNLIMITED_MODE` (default: true)
   - `COMPLIANCE_CREDIT_COST_BASE` (default: 1)
   - `COMPLIANCE_CREDIT_COST_PDF` (default: 1)
   - `COMPLIANCE_CREDIT_COST_IMAGE` (default: 1)
   - `COMPLIANCE_CREDIT_COST_HTML_FILE` (default: 1)
   - `COMPLIANCE_CREDIT_COST_HTML_STRING` (default: 0.5)
   - `COMPLIANCE_CREDIT_INITIAL_ALLOCATION` (default: 999999 for unlimited)
   - `GRAMMAR_CREDIT_COST` (default: 0.5)

3. ⏳ **Implement credit tracking logic**
   - Always log credit transactions (for analytics)
   - Only deduct credits if `CREDITS_ENABLED && !UNLIMITED_MODE`
   - Track consumption per publisher (separate from advertiser)
   - Track consumption per advertiser (separate from publisher)
   - Track usage types: 'submission', 'forwarded_check', 'standalone'
   - Track service types: 'compliance', 'grammar'
   - Track checked_by_role: 'publisher', 'advertiser', 'admin'

**Files to Create:**
- `lib/services/credit.service.ts` - Credit management service
- `env.js` - Add credit system environment variables

---

#### 10.6.5 Credit Management APIs

**Priority:** MEDIUM  
**Status:** Can Start Now

#### Tasks:
1. ⏳ **Create credit allocation RPC procedures (admin only)**
   - Procedure: `admin.credits.allocateAdvertiser`
     * Input: `advertiserId`, `amount`, `description`
     * Allocate credits to advertiser account
   - Procedure: `admin.credits.allocatePublisher`
     * Input: `publisherId`, `amount`, `description`
     * Allocate credits to publisher account
   - Admin only authorization
   - Separate endpoints for advertiser and publisher

2. ⏳ **Create credit balance query RPC procedures**
   - Procedure: `admin.credits.getAdvertiserBalance`
     * Input: `advertiserId`
     * Returns: balance, used, available credits
     * Accessible by admin and advertiser (own account)
   - Procedure: `admin.credits.getPublisherBalance`
     * Input: `publisherId`
     * Returns: balance, used, available credits
     * Accessible by admin only (publishers don't have accounts yet)

3. ⏳ **Create credit transaction history RPC procedures**
   - Procedure: `admin.credits.getAdvertiserTransactions`
     * Input: `advertiserId`, `startDate`, `endDate`, `limit`, `offset`, `usageType`, `serviceType`
     * Returns: transaction history for advertiser
   - Procedure: `admin.credits.getPublisherTransactions`
     * Input: `publisherId`, `startDate`, `endDate`, `limit`, `offset`, `usageType`, `serviceType`
     * Returns: transaction history for publisher
   - Filter by usage_type (submission, forwarded_check, standalone)
   - Filter by service_type (compliance, grammar)

4. ⏳ **Create credit refund RPC procedure (admin only)**
   - Procedure: `admin.credits.refund`
   - Input: `resultId` (compliance_result_id or grammar_result_id), `serviceType` ('compliance' | 'grammar'), `reason`
   - Refund credits on model API failure
   - Works for both compliance and grammar results

5. ⏳ **Create publisher management RPC procedures**
   - Procedure: `admin.publishers.getAll`
     * Input: `filters`, `pagination`
     * Returns: List of publishers with credit usage stats
   - Procedure: `admin.publishers.getById`
     * Input: `publisherId`
     * Returns: Publisher details with credit account and transaction history
   - Procedure: `admin.publishers.getByAffiliateId`
     * Input: `affiliateId`
     * Returns: Publisher by affiliate ID

**Files to Create:**
- `lib/rpc/procedures/admin/credits.ts` - Credit management RPC procedures
- `lib/rpc/procedures/admin/publishers.ts` - Publisher management RPC procedures

---

#### 10.6.6 Integration with Compliance Check

**Priority:** HIGH  
**Status:** After Phase 10.4 (Model API Integration)

#### Tasks:
1. ⏳ **Identify account type from request source**
   - Use `identifyAccountType(request)` to determine 'publisher' or 'advertiser'
   - Based on origin/referer headers or X-Portal-Type header

2. ⏳ **Handle publisher compliance check**
   - Extract publisher form data from request body:
     * `affiliateId`, `companyName`, `firstName`, `lastName`, `email`, `telegramId`
   - Create or get publisher using `createOrGetPublisher()`
   - Get or create publisher credit account
   - Determine usage_type:
     * If `creativeRequestId` provided → 'submission'
     * If no `creativeRequestId` → 'standalone'
   - Set `checked_by_role: 'publisher'`

3. ⏳ **Handle advertiser compliance check**
   - Get advertiser from authenticated user
   - Get advertiser credit account
   - Determine usage_type:
     * If `creativeRequestId` provided and forwarded to advertiser → 'forwarded_check'
     * If no `creativeRequestId` → 'standalone'
   - Set `checked_by_role: 'advertiser'`
   - **Note:** Advertisers never submit creatives, they only check forwarded creatives

4. ⏳ **Integrate credit check into compliance RPC procedure**
   - Check credits before model API call
   - In unlimited mode: always allow, but track
   - In limited mode: block if insufficient credits
   - Track publisher_id or advertiser_id even if no creative_request_id

5. ⏳ **Add credit consumption after successful check**
   - Consume credits after successful compliance check
   - Link to compliance_result with all tracking fields:
     * `publisher_id` or `advertiser_id`
     * `usage_type` (submission, forwarded_check, standalone)
     * `checked_by_role` (publisher, advertiser, admin)
     * `creative_request_id` (nullable)
   - Log transaction with all metadata

6. ⏳ **Add credit refund on model API failure**
   - Refund credits if model API fails (system error)
   - Don't refund if compliance fails (that's a valid result)
   - Refund based on `compliance_result_id` and `service_type`

7. ⏳ **Handle insufficient credits error**
   - Return proper error response
   - Include available credits in error
   - Status code: 402 Payment Required

**Files to Update:**
- `lib/rpc/procedures/admin/compliance.ts` - Add credit checks, publisher creation, usage type tracking
- `lib/services/compliance.service.ts` - Integrate credit service and publisher service

---

#### 10.6.7 Integration with Grammar Check

**Priority:** HIGH  
**Status:** After Phase 11.3 (Grammar RPC Procedures)

#### Tasks:
1. ⏳ **Integrate publisher creation into grammar check**
   - Same logic as compliance check
   - Identify account type from request
   - Create/get publisher if from publisher form
   - Track usage_type (submission, forwarded_check, standalone)
   - Track checked_by_role (publisher, advertiser, admin)

2. ⏳ **Integrate credit consumption into grammar check**
   - Consume 0.5 credits per grammar check
   - Track publisher_id or advertiser_id
   - Link to grammar_result with all tracking fields
   - Log transaction with usage_type and service_type

3. ⏳ **Handle grammar API failures**
   - Refund credits on grammar API failure
   - Same refund logic as compliance

**Files to Update:**
- `lib/rpc/procedures/admin/grammar.ts` - Add credit checks, publisher creation, usage type tracking
- `lib/services/grammar.service.ts` - Integrate credit service and publisher service

---

#### 10.6.8 Credit Seed Script

**Priority:** MEDIUM  
**Status:** When Publisher Portal Phase Starts

#### Tasks:
1. ⏳ **Create credit account seed script**
   - Create credit accounts for all existing advertisers
   - Initial allocation: 999999 credits (effectively unlimited)
   - Log allocation transaction
   - File: `seed-scripts/seed-credits.ts`
   - Note: Publishers will get credit accounts created automatically on first AI usage

**Files to Create:**
- `seed-scripts/seed-credits.ts` - Credit account seed script

---

#### Credit System Business Rules

**Current Mode (Unlimited):**
- All advertisers get 999999 credits (effectively unlimited)
- All publishers get 999999 credits (effectively unlimited, created on first AI usage)
- All credit consumption is tracked but not enforced
- No credit blocking
- Full analytics available

**Future Mode (When Publisher Portal v2 Launches):**
- Enable credit enforcement (flip feature flag)
- Set real credit limits (separate for advertisers and publishers)
- Enable credit blocking
- Add credit purchase flow (if needed)
- Separate credit allocation for advertisers and publishers

**Credit Costs:**
- Compliance check: 1 credit (base)
- Different costs per input type (configurable)
- Grammar check: 0.5 credits

**Usage Types:**
- `submission`: Publisher submitted creative (tied to creative_request)
- `forwarded_check`: Advertiser checked forwarded creative from admin (tied to creative_request)
- `standalone`: AI-only usage (no creative_request, can be publisher or advertiser)

**Account Types:**
- `advertiser`: Advertiser credit account (separate pool)
- `publisher`: Publisher credit account (separate pool)
- Completely independent - no mixing

**Publisher Creation:**
- Created automatically on first AI usage (compliance or grammar check)
- Even if no creative submission
- Matched by: affiliate_id → email → company_name + first_name + last_name
- Tracked in analytics even if never submits

**Advertiser Workflow:**
- Advertisers never submit creatives
- They only check/review creatives forwarded by admin
- They can use AI standalone (testing, checking guidelines)
- Usage types: 'forwarded_check' (tied to creative) or 'standalone' (no creative)

---

## Phase 11: Grammar Correction Model Integration

**Priority:** HIGH  
**Status:** Can Start Now (Model Deployed)  
**Reference:** [Grammar Correction API](https://grammar-correction-1-5tha.onrender.com/)

### Overview

This phase covers integration with the Grammar Correction Model API that corrects grammar in text, images (OCR), HTML files, and ZIP archives. The model is production-ready and deployed.

**Model Status:** Deployed and ready - Can start integration immediately

**Key Features:**
- Supports: images (.jpg, .png), HTML (.html, .htm), ZIP archives, text
- OCR: extracts text from images using EasyOCR
- HTML processing: preserves structure, highlights corrections
- Batch processing: up to 100 files per ZIP archive
- Async processing: Celery tasks with task polling
- Preview system: HTML previews stored for 1 hour

---

### 11.1 Database Schema for Grammar Results

**Priority:** HIGH  
**Status:** Can Start Now

#### Tasks:
1. ⏳ **Create grammar_results table schema**
   - Fields:
     * `id` - Primary key (uuid)
     * `creative_request_id` - FK to creative_requests (nullable, NULL if AI-only usage)
     * `publisher_id` - FK to publishers (nullable, track publisher even without submission)
     * `advertiser_id` - FK to advertisers (nullable, track advertiser even without submission)
     * `input_type` - Enum: 'image' | 'html' | 'zip' | 'text'
     * `original_file_url` - URL to original file (blob storage)
     * `corrected_file_url` - URL to corrected file (blob storage, nullable)
     * `preview_id` - Preview ID from grammar API (nullable, 1-hour TTL)
     * `task_id` - Task ID from grammar API (for async tracking)
     * `status` - Enum: 'pending' | 'processing' | 'completed' | 'failed'
     * `corrections_count` - Integer (nullable)
     * `format` - Enum: 'json' | 'html'
     * `usage_type` - Enum: 'submission' | 'forwarded_check' | 'standalone' (NEW)
     * `checked_by_role` - Enum: 'publisher' | 'advertiser' | 'admin' (NEW)
     * `credit_account_id` - FK to credit_accounts (nullable)
     * `credits_consumed` - Integer (default: 0.5)
     * `credit_transaction_id` - FK to credit_transactions (nullable)
     * `created_at` - Timestamp
     * `completed_at` - Timestamp (nullable)
     * `error_message` - Text (nullable)
   - Add to `lib/schema.ts`
   - Create migration
   - Indexes:
     * Index on `creative_request_id`
     * Index on `publisher_id`
     * Index on `advertiser_id`
     * Index on `task_id`
     * Index on `status`
     * Index on `usage_type`

2. ⏳ **Create grammar_corrections table (optional - normalized)**
   - Fields: `id`, `grammar_result_id` (FK), `original_text`, `corrected_text`, `correction_type` (nullable), `position` (JSONB, nullable), `confidence` (nullable), `created_at`
   - Add to `lib/schema.ts`
   - Create migration

3. ⏳ **Create and run database migrations for grammar tables**
   - Add grammar_results and grammar_corrections table definitions to `lib/schema.ts`
   - Include all fields from Phase 10.6.2 updates (publisher_id, advertiser_id, usage_type, checked_by_role, credit fields)
   - Generate migration: `pnpm drizzle-kit generate` or `npx drizzle-kit generate`
   - Review migration file in `drizzle/migrations/XXXXXX_create_grammar_results.sql`
   - Run migration: `pnpm drizzle-kit migrate` or `npx drizzle-kit migrate`
   - Verify tables created in NeonDB
   - Test: Insert test grammar result, verify constraints work

**Files to Create/Update:**
- `lib/schema.ts` - Add grammar tables with all fields
- `drizzle/migrations/XXXXXX_create_grammar_results.sql` - Migration file (auto-generated)
- `drizzle/migrations/XXXXXX_create_grammar_corrections.sql` - Migration file (auto-generated, if normalized)
- Run migrations to create tables in database

---

### 11.2 Grammar Service Wrapper

**Priority:** HIGH  
**Status:** Can Start Now

#### Tasks:
1. ⏳ **Create grammar service wrapper**
   - Create `lib/services/grammar.service.ts`
   - Methods: `checkGrammar()`, `getTaskStatus()`, `downloadCorrectedFile()`, `checkHealth()`
   - Handle async processing (task polling)
   - Error handling & retry logic
   - File upload/download handling

2. ⏳ **Add environment variables to env.js**
   - `GRAMMAR_API_URL` (default: "https://grammar-correction-1-5tha.onrender.com")
   - `GRAMMAR_API_KEY` (optional)
   - `GRAMMAR_API_TIMEOUT_MS` (default: 30000)
   - `GRAMMAR_API_ENABLED` (default: true)
   - `GRAMMAR_PREVIEW_TTL_HOURS` (default: 1)
   - `GRAMMAR_CREDIT_COST` (default: 0.5)

3. ⏳ **Implement async task polling**
   - Poll grammar API for task status
   - Handle task completion/failure
   - Timeout handling

4. ⏳ **Implement file handling**
   - Download file from blob storage
   - Upload to grammar API
   - Download corrected file from grammar API
   - Upload corrected file to blob storage
   - Handle file size limits (10MB single, 50MB ZIP)

**Files to Create:**
- `lib/services/grammar.service.ts` - Grammar service wrapper
- `env.js` - Add grammar API environment variables

---

### 11.3 Grammar RPC Procedures

**Priority:** HIGH  
**Status:** Can Start Now

#### Tasks:
1. ⏳ **Create grammar check RPC procedure**
   - Procedure: `admin.grammar.check`
   - Input:
     * Publisher form data (if from publisher form, optional):
       - `affiliateId`, `companyName`, `firstName`, `lastName`, `email`, `telegramId`
     * Grammar check data:
       - `creativeRequestId` (optional, NULL if AI-only usage)
       - `fileUrl`, `inputType`, `format`
   - Output: `{ taskId, grammarResultId, status }`
   - Note: Publisher data extracted from request if from publisher form
   - Note: Can be called standalone (no creativeRequestId) for AI-only usage

2. ⏳ **Create task status check RPC procedure**
   - Procedure: `admin.grammar.getTaskStatus`
   - Input: `taskId`, `grammarResultId`
   - Output: Task status and result (if completed)

3. ⏳ **Create download corrected file RPC procedure**
   - Procedure: `admin.grammar.download`
   - Input: `grammarResultId`
   - Output: File download

4. ⏳ **Create get grammar result RPC procedure**
   - Procedure: `admin.grammar.getResult`
   - Input: `grammarResultId`
   - Output: Grammar result with corrections

5. ⏳ **Create grammar health check RPC procedure**
   - Procedure: `admin.grammar.health`
   - Output: Grammar API health status

**Files to Create:**
- `lib/rpc/procedures/admin/grammar.ts` - Grammar RPC procedures
- Note: Publisher creation and credit integration handled in Phase 10.6.7

---

### 11.4 Workflow Integration

**Priority:** MEDIUM  
**Status:** After Phase 4 (Requests/Responses) and Phase 11.3

#### Tasks:
1. ⏳ **Integrate grammar check into creative submission flow**
   - Optional grammar check in Publisher Form
   - Show grammar corrections before submission
   - Download corrected files

2. ⏳ **Integrate grammar check into admin review**
   - Optional grammar check in Admin Portal
   - Show corrections side-by-side
   - Accept/reject grammar suggestions

3. ⏳ **Integrate grammar check into brand guidelines**
   - Optional grammar check for brand guidelines (Advertiser Portal)
   - Preview corrections

4. ⏳ **Add grammar status to creative requests**
   - Add `grammar_status` field to creative_requests
   - Values: "pending" | "completed" | "failed" | "not_checked"
   - Link to grammar_result

**Files to Update:**
- `lib/schema.ts` - Add grammar_status to creative_requests
- `lib/rpc/procedures/admin/requests.ts` - Add grammar check triggers

---

### 11.5 Credit Integration

**Priority:** HIGH  
**Status:** After Phase 10.6.7 (Credit Integration with Grammar)

#### Tasks:
1. ⏳ **Credit integration already handled in Phase 10.6.7**
   - Publisher creation on grammar check
   - Credit consumption (0.5 credits per check)
   - Usage type tracking (submission, forwarded_check, standalone)
   - Checked by role tracking (publisher, advertiser, admin)
   - Refund on API failure
   - See Phase 10.6.7 for complete implementation details

**Note:** Credit integration for grammar checks is fully implemented in Phase 10.6.7, so this section is for reference only.

---

### 11.6 Frontend Integration (Last)

**Priority:** LOW  
**Status:** After All Backend Phases

#### Tasks:
1. ⏳ **Grammar check UI in Publisher Form**
2. ⏳ **Grammar check UI in Admin Portal**
3. ⏳ **Grammar check UI in Advertiser Portal**

**Note:** Frontend tasks will be implemented last, after all backend phases are complete.

---

## Phase 12: Analytics Frontend (Last)

**Priority:** MEDIUM  
**Status:** After All Backend Phases

### Overview

This phase covers building the analytics dashboard frontend for the Admin Portal. All backend APIs will be ready from previous phases.

**Note:** This phase is intentionally placed last to ensure all backend APIs are complete and stable before building the frontend.

---

### 12.1 Dashboard Statistics Frontend

**Priority:** HIGH  
**Status:** After Phase 3 (Dashboard Stats API)

#### Tasks:
1. ⏳ **Build dashboard statistics cards**
   - Total requests, pending, approved, rejected
   - Active advertisers, active publishers
   - Use data from `admin.dashboard.stats` RPC procedure

2. ⏳ **Build performance charts**
   - Request volume over time
   - Approval/rejection rates
   - Average processing time
   - Use data from `admin.dashboard.performance` RPC procedure

3. ⏳ **Add real-time updates**
   - Auto-refresh statistics
   - WebSocket/SSE integration (if Phase 9.3 implemented)
   - Polling fallback

**Files to Create:**
- `app/(admin)/dashboard/page.tsx` - Dashboard page
- `components/admin/dashboard/StatsCards.tsx` - Statistics cards
- `components/admin/dashboard/PerformanceCharts.tsx` - Performance charts

---

### 12.2 Credit System Analytics Frontend

**Priority:** MEDIUM  
**Status:** After Phase 10.6 (Credit System)

#### Tasks:
1. ⏳ **Build credit usage overview dashboard**
   - Total credits allocated/consumed (both advertiser and publisher)
   - Credits consumed per time period
   - Credit utilization trends
   - Comparison: Advertiser vs Publisher usage
   - Usage breakdown by type: submission, forwarded_check, standalone
   - Service breakdown: compliance vs grammar

2. ⏳ **Build advertiser credit analytics**
   - Total credits allocated to advertisers
   - Credits consumed per advertiser
   - Top advertiser credit consumers
   - Advertiser credit utilization trends
   - Usage breakdown: forwarded_check vs standalone
   - Service breakdown: compliance vs grammar

3. ⏳ **Build publisher credit analytics**
   - Total credits allocated to publishers
   - Credits consumed per publisher
   - Top publisher credit consumers
   - Publisher credit utilization trends
   - New publishers (first-time credit users)
   - Publishers with AI-only usage (never submitted)
   - Publishers with submissions
   - Usage breakdown: submission vs standalone
   - Service breakdown: compliance vs grammar

4. ⏳ **Build credit transaction history table**
   - Filter by account type (advertiser/publisher)
   - Filter by advertiser or publisher
   - Filter by date range
   - Filter by transaction type
   - Filter by usage type (submission, forwarded_check, standalone)
   - Filter by service type (compliance, grammar)
   - Pagination
   - Export functionality

5. ⏳ **Build credit allocation UI**
   - Allocate credits to advertiser (separate form)
   - Allocate credits to publisher (separate form)
   - View advertiser credit balance
   - View publisher credit balance
   - Refund credits (admin only)
   - Separate tabs/sections for advertiser and publisher credits

6. ⏳ **Build publisher management UI**
   - Publisher list with credit usage stats
   - Publisher details view:
     * Publisher information (affiliate ID, company name, email, etc.)
     * Credit account balance
     * Credit transaction history
     * AI usage breakdown (submission vs standalone)
     * Service usage breakdown (compliance vs grammar)
   - Filter publishers:
     * By status (active/inactive)
     * By credit usage (high/low)
     * By usage type (with submissions, AI-only)
   - Search by affiliate ID, company name, email

**Files to Create:**
- `app/(admin)/credits/page.tsx` - Credit management page
- `app/(admin)/credits/advertisers/page.tsx` - Advertiser credit analytics
- `app/(admin)/credits/publishers/page.tsx` - Publisher credit analytics
- `app/(admin)/publishers/page.tsx` - Publisher management page
- `app/(admin)/publishers/[id]/page.tsx` - Publisher detail page
- `components/admin/credits/CreditOverview.tsx` - Credit overview dashboard
- `components/admin/credits/AdvertiserCreditDashboard.tsx` - Advertiser credit analytics
- `components/admin/credits/PublisherCreditDashboard.tsx` - Publisher credit analytics
- `components/admin/credits/CreditAllocation.tsx` - Credit allocation form (both types)
- `components/admin/credits/TransactionHistory.tsx` - Transaction table with filters
- `components/admin/publishers/PublisherList.tsx` - Publisher list with stats
- `components/admin/publishers/PublisherDetail.tsx` - Publisher detail view

---

### 12.3 Compliance Analytics Frontend

**Priority:** MEDIUM  
**Status:** After Phase 10 (Compliance Model)

#### Tasks:
1. ⏳ **Build compliance statistics dashboard**
   - Pass/fail rates
   - Violations by type
   - Compliance trends over time
   - Top violation types

2. ⏳ **Build compliance result viewer**
   - View compliance results
   - Show violations with details
   - Filter by status and violation type

3. ⏳ **Build compliance comparison view**
   - Compare compliance across advertisers
   - Compare compliance across time periods

**Files to Create:**
- `app/(admin)/compliance/page.tsx` - Compliance analytics page
- `components/admin/compliance/ComplianceStats.tsx` - Compliance statistics
- `components/admin/compliance/ViolationViewer.tsx` - Violation details

---

### 12.4 Grammar Analytics Frontend

**Priority:** LOW  
**Status:** After Phase 11 (Grammar Correction)

#### Tasks:
1. ⏳ **Build grammar statistics dashboard**
   - Grammar checks performed
   - Average corrections per check
   - Grammar check trends
   - Success/failure rates

2. ⏳ **Build grammar result viewer**
   - View grammar corrections
   - Side-by-side comparison
   - Download corrected files
   - Preview HTML corrections

**Files to Create:**
- `app/(admin)/grammar/page.tsx` - Grammar analytics page
- `components/admin/grammar/GrammarStats.tsx` - Grammar statistics
- `components/admin/grammar/CorrectionViewer.tsx` - Correction viewer

---

### 12.5 Request Analytics Frontend

**Priority:** HIGH  
**Status:** After Phase 4 (Requests/Responses)

#### Tasks:
1. ⏳ **Build request analytics dashboard**
   - Request volume trends
   - Status distribution
   - Average processing time
   - Request sources (advertiser/publisher)

2. ⏳ **Build request filtering and search**
   - Filter by status, advertiser, date range
   - Search by ID or content

3. ⏳ **Build request detail view**
   - Full request details
   - Compliance results
   - Grammar results
   - History timeline

**Files to Create:**
- `app/(admin)/requests/page.tsx` - Requests list page
- `app/(admin)/requests/[id]/page.tsx` - Request detail page
- `components/admin/requests/RequestFilters.tsx` - Filter component
- `components/admin/requests/RequestDetail.tsx` - Detail view

---

### 12.6 General Analytics Features

**Priority:** MEDIUM  
**Status:** Throughout Phase 12

#### Tasks:
1. ⏳ **Build date range picker**
   - Custom date range
   - Preset ranges (today, week, month, year)
   - Timezone handling

2. ⏳ **Build export functionality**
   - Export to CSV, PDF
   - Export charts as images

3. ⏳ **Build data visualization components**
   - Line charts, bar charts, pie charts
   - Tables with sorting/filtering

4. ⏳ **Build responsive design**
   - Mobile-friendly layouts
   - Tablet optimization
   - Desktop optimization

**Files to Create:**
- `components/admin/analytics/DateRangePicker.tsx` - Date picker
- `components/admin/analytics/ExportButton.tsx` - Export functionality
- `components/admin/analytics/ChartWrapper.tsx` - Chart wrapper
- `lib/utils/export.ts` - Export utilities

---

## Phase 13: Testing & Cleanup (Week 6-7)

### 13.1 Testing

**Priority:** HIGH  
**Status:** Not Started

#### Tasks:
1. ⏳ **Unit tests for business logic**
   - Status transition validation
   - Statistics calculations
   - Reference: `docs/Backend_Implementation_TODOs.md` lines 1866-1886

2. ⏳ **Integration tests for APIs**
   - Test all endpoints
   - Test error scenarios
   - Reference: `docs/Backend_Implementation_TODOs.md` lines 1888-1949

3. ⏳ **Load testing**
   - Use k6 or similar
   - Test under load
   - Reference: `docs/Backend_Implementation_TODOs.md` lines 1951-1981

---

### 13.2 Code Cleanup

**Priority:** MEDIUM  
**Status:** Not Started

#### Tasks:
1. ⏳ **Remove mock data files**
   - `features/admin/models/request.model.ts`
   - `features/admin/models/response.model.ts`
   - `features/admin/models/admin.model.ts`
   - `features/admin/models/performance-chart.model.ts`
   - Reference: `docs/BACKEND_TODOS_SUMMARY.md` lines 190-197

2. ⏳ **Update service layer**
   - Replace all mock imports with API calls
   - Add error handling
   - Add retry logic

3. ⏳ **Remove TODO comments**
   - Clean up completed TODOs
   - Keep only future enhancements

---

## Summary Statistics

### By Status:
- **Done:** 35+ tasks (Sprint 1 + Phase 3.1-3.9 + Phase 4.1 completed)
  - Phase 3.1: Admin Dashboard & Stats ✅
  - Phase 3.2: Requests & Responses APIs ✅
  - Phase 3.3: Advertiser Response APIs ✅
  - Phase 3.4: Notifications ✅
  - Phase 3.5: Audit History ✅
  - Phase 3.6: Offers CRUD ✅
  - Phase 3.7: Advertisers CRUD ✅
  - Phase 3.8: Publishers CRUD ✅
  - Phase 3.9: Brand Guidelines Linking ✅
  - Phase 4.1: Client/Server Boundary Fixed ✅
- **In Progress/Backlog:** 90+ tasks (includes compliance, credit system, publisher system, grammar, analytics, Everflow integration)
- **Blocked (Pending Deployment):** 8 tasks (Compliance Model Integration - Phase 10.4)
- **Hold:** 0 tasks (all backend hold tasks moved to active)
- **Security Issues (Priority 1):** 4 tasks (Input validation, Admin seed endpoint, Client/server boundary, Input sanitization)

### By Priority:
- **CRITICAL:** 8 tasks (Database schema, Auth, Core APIs)
- **HIGH:** 20+ tasks (Dashboard, Requests, Offers)
- **MEDIUM:** 15+ tasks (Advertisers, Publishers, Notifications)
- **LOW:** 5+ tasks (Real-time, Advanced features)

### By Phase:
- **Phase 1 (Foundation):** 7 tasks (2 ✅ Done, 5 ⏳ Remaining)
- **Phase 2 (Auth/RPC):** 3 tasks (5 ✅ Done, 1 ⏳ Remaining)
- **Phase 3 (Dashboard & Core APIs):** 9 tasks (9 ✅ Done - Phase 3.1-3.9)
  - ✅ 3.1: Admin Dashboard & Stats
  - ✅ 3.2: Requests & Responses APIs
  - ✅ 3.3: Advertiser Response APIs
  - ✅ 3.4: Notifications
  - ✅ 3.5: Audit History
  - ✅ 3.6: Offers CRUD
  - ✅ 3.7: Advertisers CRUD
  - ✅ 3.8: Publishers CRUD
  - ✅ 3.9: Brand Guidelines Linking
- **Phase 4 (Requests/Responses):** 11 tasks (8 ✅ Done - Phase 3.2, 3.3, 3.4, 3.5, 4.1, 3 ⏳ Remaining)
  - ✅ 4.1: Client/Server Boundary Fixed
- **Phase 5 (Offers):** 9 tasks (5 ✅ Done - Phase 3.6, 4 ⏳ Remaining)
- **Phase 5.5 (Everflow Integration):** 18 tasks (0 ✅ Done, 18 ⏳ Remaining)
  - API Configuration: 3 tasks
  - Offers Sync: 6 tasks
  - Advertisers Sync: 6 tasks
  - Scheduling: 3 tasks
  - Error Handling: 3 tasks
- **Phase 6 (Advertisers/Publishers):** 13 tasks (10 ✅ Done - Phase 3.7, 3.8, 3 ⏳ Remaining)
- **Phase 7 (Brand Guidelines):** 2 tasks (2 ✅ Partially Done - Phase 3.9, Full implementation remaining)
- **Phase 8 (Infrastructure):** 12+ tasks (3 ✅ Done, 9+ ⏳ Remaining)
  - ✅ 8.2.1: Install Zod validation
  - ✅ 8.2.2: Configure CORS & CSP
  - ✅ 8.2.3: Configure Vercel project
  - ⏳ 8.2.4-10: Security tasks (NEW - from Admin Architecture Test Report)
- **Phase 9 (Advanced):** 8 tasks (0 ✅ Done, 8 ⏳ Remaining)
- **Phase 10 (Compliance Model):** 24 tasks (0 ✅ Done, 16 ⏳ Can start, 8 ⏳ Blocked pending deployment)
- **Phase 11 (Grammar Correction):** 11 tasks (0 ✅ Done, 11 ⏳ Remaining - can start now, model deployed)
- **Phase 12 (Analytics Frontend):** 24 tasks (0 ✅ Done, 24 ⏳ Remaining - last, after all backend phases)
  - Includes: Enhanced credit analytics with publisher tracking
- **Phase 13 (Testing):** 3 tasks (0 ✅ Done, 3 ⏳ Remaining)

---

## Next Immediate Steps (This Week)

1. **Complete Database Schema** (Priority 1)
   - Add creative_requests table to `lib/schema.ts`
   - Add creative_request_history table
   - Create and run migration

2. **Expose Auth RPC Helpers** (Priority 2)
   - Add `auth.currentUser` and `auth.currentRole` to RPC router
   - Test with frontend

3. **Configure Blob Storage** (Priority 2.5 - Can be done in parallel, moved from Hold)
   - Install Vercel Blob SDK (or S3/R2)
   - Create storage service wrapper
   - Set up environment variables
   - Test file upload/download
   - Required before Phase 7 (Brand Guidelines file uploads)
   - Reference: Phase 8.3 - Blob Storage Configuration

4. **Install and Configure Redis** (Priority 2.5 - Can be done in parallel, moved from Hold)
   - Install Redis client (Upstash recommended)
   - Configure connection
   - Set up rate limiter
   - Required for caching and rate limiting
   - Reference: Phase 8.1 - Caching & Performance

5. **Implement Dashboard Stats API** (Priority 3)
   - Create `admin.dashboard.stats` RPC procedure
   - Implement SQL queries
   - Add caching

6. **Start Requests API** (Priority 4)
   - Implement `admin.requests.getAll` procedure
   - Add pagination and filtering

---

## References

### Documentation Files:
- `docs/START_HERE.md` - Project overview
- `docs/Backend_Implementation_TODOs.md` - Complete API specifications (2457 lines)
- `docs/BACKEND_TODOS_SUMMARY.md` - Quick reference (496 lines)
- `docs/STATS_AND_CHARTS_BACKEND_TODOS.md` - Statistics guide (799 lines)
- `docs/UNIFIED_MODEL_EXPLANATION.md` - Architecture explanation
- `docs/PERSONALIZATION_BACKEND_TODOS.md` - Color customization

### Key Code Files:
- `lib/schema.ts` - Database schema (currently: users, sessions, accounts)
- `lib/rpc/router.ts` - RPC router (currently: health only)
- `features/admin/services/*.service.ts` - Service layer (all have TODOs)
- `features/admin/types/admin.types.ts` - Type definitions with SQL schema (lines 29-110)

### Notion Tasks:
- Sprint 1: 12 tasks (all Done)
- Sprint 2: Multiple tasks in Backlog
- See Notion for full task details and assignments

---

**Last Updated:** 2025-01-XX  
**Next Review:** After Priority 1 Security Fixes

---

## Recent Completions (Phase 3.1 - 3.9, Phase 4.1)

### ✅ Completed Phases:

**Phase 3.1: Admin Dashboard & Stats** ✅
- Dashboard statistics API implemented
- Real-time stats with trends
- Service: `features/admin/services/dashboard.service.ts`
- API: `app/api/admin/dashboard/stats/route.ts`

**Phase 3.2: Requests & Responses APIs** ✅
- GET /api/admin/requests (with pagination, filtering, search)
- GET /api/admin/requests/[id]
- POST /api/admin/requests/[id]/approve
- POST /api/admin/requests/[id]/reject
- Full CRUD operations for creative requests

**Phase 3.3: Advertiser Response APIs** ✅
- GET /api/advertiser/responses
- POST /api/advertiser/responses/[id]/approve
- POST /api/advertiser/responses/[id]/send-back
- Ownership enforcement (advertisers can only access their own requests)

**Phase 3.4: Notifications** ✅
- Workflow event notifications
- Slack/Discord webhook integration
- Service: `features/notifications/notification.service.ts`

**Phase 3.5: Audit History** ✅
- request_status_history table
- Status change logging
- GET /api/admin/requests/[id]/history
- Service: `features/admin/services/statusHistory.service.ts`

**Phase 3.6: Offers CRUD** ✅
- Full CRUD operations for offers
- GET, POST, PUT, DELETE endpoints
- Soft delete implementation
- Service: `features/admin/services/offer.service.ts`

**Phase 3.7: Advertisers CRUD** ✅
- Full CRUD operations for advertisers
- Distinct advertisers table
- Soft delete implementation
- Service: `features/admin/services/advertiser.service.ts`

**Phase 3.8: Publishers CRUD** ✅
- Full CRUD operations for publishers
- Distinct publishers table
- Soft delete implementation
- Service: `features/admin/services/publisher.service.ts`

**Phase 3.9: Brand Guidelines Linking** ✅
- POST /api/admin/offers/[id]/brand-guidelines (attach)
- DELETE /api/admin/offers/[id]/brand-guidelines (detach)
- File validation (only "clean" files can be attached)
- Service: `features/admin/services/brandGuidelines.service.ts`

**Phase 4.1: Client/Server Boundary Fixed** ✅
- ViewModels refactored to use client adapters
- Client adapters created for all entities
- Clean separation of concerns

### ⚠️ Security Issues Identified:

See **Phase 8.2: Security & Validation** section for detailed security tasks added from Admin Architecture Test Report.

