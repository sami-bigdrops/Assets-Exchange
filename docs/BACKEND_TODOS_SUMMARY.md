# Backend Implementation TODOs - Quick Reference

This document provides a quick summary of all backend TODOs scattered throughout the codebase. For detailed implementation guides, see [Backend_Implementation_TODOs.md](./Backend_Implementation_TODOs.md).

---

## Files with Backend TODOs

### 1. Type Definitions

**File:** `/features/admin/types/admin.types.ts`

- Database schema design for `publisher_requests`, `advertiser_responses`, and `request_status_history` tables
- Complete SQL CREATE statements provided
- Indexes and foreign keys documented

### 2. Dashboard Statistics Service

**File:** `/features/admin/services/admin.service.ts`

- `getAdminDashboardData()` → `GET /api/admin/dashboard/stats`
- Calculate 5 key statistics: Total Assets, New Requests, Approved Assets, Rejected Assets, Pending Approval
- Include trend calculations (today vs yesterday)
- Include historical data (Yesterday, Current Month, Last Month)
- Query examples provided in file
- Caching strategy: 2-minute TTL

### 3. Performance Chart Service

**File:** `/features/admin/services/performance-chart.service.ts`

- `getPerformanceChartData()` → `GET /api/admin/dashboard/performance`
- Support 4 comparison types:
  - Today vs Yesterday (24 hourly data points)
  - Today vs Last Week (24 hourly data points)
  - Current Week vs Last Week (7 daily data points)
  - Current Month vs Last Month (31 daily data points)
- Time-series aggregation queries provided
- Fill missing data points with zeros
- Caching strategy: 5-15 minute TTL

### 4. Request Service Layer

**File:** `/features/admin/services/request.service.ts`

All functions need backend API integration:

#### Read Operations:

- `getRequests()` → `GET /api/admin/requests`
- `getAllRequests()` → `GET /api/admin/requests/all`
- `getRecentPublisherRequests()` → `GET /api/admin/requests/recent`
- `getAllAdvertiserResponses()` → `GET /api/admin/responses`
- `getRecentAdvertiserResponses()` → `GET /api/admin/responses/recent`
- `getRequestById()` → `GET /api/admin/requests/:id`
- `getResponseById()` → `GET /api/admin/responses/:id`
- `getRelatedResponse()` → `GET /api/admin/requests/:id/related-response`
- `getRelatedRequest()` → `GET /api/admin/responses/:id/related-request`

#### Write Operations (need implementation):

- `POST /api/admin/requests/:id/approve-and-forward`
- `POST /api/admin/requests/:id/reject-and-send-back`
- `POST /api/admin/responses/:id/reject-and-send-back`

Each TODO includes:

- Query parameters documentation
- Response format
- Error handling requirements
- SQL query examples

### 3. Offers Management

**Files:**

- `/features/admin/components/Offers.tsx`
- `/features/admin/components/BulkEditModal.tsx`
- `/features/admin/components/OfferDetailsModal.tsx`
- `/features/admin/components/NewOfferManuallyModal.tsx`
- `/features/admin/services/offers.service.ts`

**Endpoints Required:**

- `GET /api/admin/offers` - Get all offers with pagination, filtering, sorting
- `GET /api/admin/offers/:id` - Get offer by ID with brand guidelines
- `POST /api/admin/offers` - Create new offer (manually)
- `PUT /api/admin/offers/:id` - Update offer details
- `DELETE /api/admin/offers/:id` - Delete offer
- `PATCH /api/admin/offers/:id/status` - Update offer status
- `PATCH /api/admin/offers/:id/visibility` - Update offer visibility
- `POST /api/admin/offers/bulk-update` - Bulk update multiple offers
- `POST /api/admin/offers/pull-from-api` - Sync offers from external API

**Key Features:**

- Bulk editing of offers (visibility, brand guidelines)
- Brand guidelines support (URL, file upload, rich text)
- Conditional editing based on creation method (Manually vs API)
- File upload handling (max 10MB, .doc, .docx, .pdf)
- Pull from external API with conflict resolution

### 4. Advertisers Management

**Files:**

- `/features/admin/components/Advertiser.tsx`
- `/features/admin/services/advertiser.service.ts`

**Endpoints Required:**

- `GET /api/admin/advertisers` - Get all advertisers
- `GET /api/admin/advertisers/:id` - Get advertiser by ID
- `POST /api/admin/advertisers` - Create new advertiser
- `PUT /api/admin/advertisers/:id` - Update advertiser
- `DELETE /api/admin/advertisers/:id` - Delete advertiser
- `PATCH /api/admin/advertisers/:id/status` - Update advertiser status
- `POST /api/admin/advertisers/pull-from-api` - Sync advertisers from external API

**Key Features:**

- Brand guidelines management
- Pull from external API
- Edit details functionality

### 5. Publishers Management

**Files:**

- `/features/admin/components/Publisher.tsx`
- `/features/admin/services/publisher.service.ts`

**Endpoints Required:**

- `GET /api/admin/publishers` - Get all publishers
- `GET /api/admin/publishers/:id` - Get publisher by ID
- `POST /api/admin/publishers` - Create new publisher
- `PUT /api/admin/publishers/:id` - Update publisher
- `DELETE /api/admin/publishers/:id` - Delete publisher
- `PATCH /api/admin/publishers/:id/status` - Update publisher status

**Key Features:**

- Brand guidelines management
- Edit details functionality

### 6. Brand Guidelines Management

**Files:**

- `/features/admin/components/BrandGuidelinesModal.tsx`

**Endpoints Required:**

- `GET /api/admin/{entityType}s/:id/brand-guidelines` - Get brand guidelines
  - Supports: offers, advertisers, publishers
- `PUT /api/admin/{entityType}s/:id/brand-guidelines` - Create/update brand guidelines
  - Supports: URL, file upload, rich text input
  - File upload: multipart/form-data, max 10MB, .doc/.docx/.pdf

**Key Features:**

- Three input types: URL, file upload, rich text editor
- File preview (PDF viewer, DOCX download)
- Notes field for additional information
- Works across offers, advertisers, and publishers

### 7. UI Components

**File:** `/features/admin/components/RequestItem.tsx`

Button handlers need implementation:

1. **Approve and Forward Button** (lines ~289-298)
   - API call to approve endpoint
   - Loading states
   - Success/error toasts
   - Data refresh

2. **Reject and Send Back Button** (lines ~300-311 and ~318-330)
   - Modal for rejection reason
   - API call to reject endpoint
   - Notifications
   - Data refresh

3. **View Request Button** (lines ~230-241)
   - Navigation to detail page
   - Route: `/requests/:id`

### 6. Mock Data Files (To be removed)

**Files:**

- `/features/admin/models/request.model.ts` - Request/Response mock data
- `/features/admin/models/response.model.ts` - Advertiser response mock data
- `/features/admin/models/admin.model.ts` - Dashboard statistics mock data
- `/features/admin/models/performance-chart.model.ts` - Performance chart mock data

Action: Delete these files once backend APIs are integrated

### 7. Authentication & Authorization

**Files:**

- `/app/(dashboard)/requests/page.tsx`
- `/app/(dashboard)/response/page.tsx`

TODOs:

- Implement proper JWT authentication
- Replace `getCurrentUser()` with actual auth service
- Implement role-based access control
- Session management with Redis
- Rate limiting
- Security headers

---

## Priority Implementation Order

### Phase 1: Foundation (Week 1-2)

1. Set up database schema
2. Create migration scripts
3. Set up Redis for caching and sessions
4. Implement authentication middleware
5. Create health check endpoint

### Phase 2: Core APIs (Week 3-4)

1. Dashboard statistics endpoint
2. Performance chart endpoint
3. GET endpoints for requests/responses
4. GET endpoints for offers/advertisers/publishers
5. Pagination and filtering
6. Search functionality
7. Caching layer
8. Basic error handling

### Phase 3: Actions (Week 5-6)

1. Approve and forward functionality
2. Reject and send back functionality
3. Status history tracking
4. Notifications
5. Transaction management
6. Offer/Advertiser/Publisher CRUD operations
7. Brand guidelines management (URL, file upload, rich text)
8. Bulk update operations
9. Pull from external API functionality

### Phase 4: Enhancement (Week 7-8)

1. Dashboard statistics pre-aggregation
2. Scheduled jobs for stats cache
3. Performance optimization
4. Load testing
5. Monitoring and logging
6. Security hardening
7. Documentation updates

---

## Critical Business Logic

### Request Workflow

```
Publisher Request (new, admin)
    ↓ Admin Approves
Request (pending, advertiser) + Creates Response (pending, advertiser)
    ↓ Advertiser Approves
Request (approved, completed)
```

### State Transitions

- Only `new` requests at `admin` stage can be approved by admin
- Approval creates advertiser response automatically (atomic transaction)
- `sent-back` responses at `advertiser` stage appear in admin's `/requests` "Sent Back" tab
- Admin can only reject these sent-back items

### Key Constraints

1. Status transitions must be validated
2. Bidirectional linking via `parent_request_id` and `child_response_id`
3. All actions must be logged in status history
4. Notifications sent on all state changes

---

## Quick Start for Backend Engineers

1. **Read the detailed guide:**

   ```bash
   cat docs/Backend_Implementation_TODOs.md
   ```

2. **Set up database:**
   - Copy SQL from `/features/admin/types/admin.types.ts`
   - Run migrations
   - Create indexes

3. **Review mock data structure:**
   - Check `/features/admin/models/request.model.ts`
   - Check `/features/admin/models/response.model.ts`
   - This shows the exact data structure frontend expects

4. **Implement endpoints in order:**
   - Start with GET endpoints
   - Add caching layer
   - Implement POST endpoints
   - Add error handling

5. **Test integration:**
   - Update service layer to call real APIs
   - Remove mock data imports
   - Test each endpoint
   - Verify error scenarios

---

## Environment Setup Required

```bash
# Database
DATABASE_URL=mysql://user:password@localhost:3306/assets_exchange

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_secret_key

# See Backend_Implementation_TODOs.md for complete list
```

---

## Testing Checklist

### Database

- [ ] Database schema created
- [ ] Indexes created
- [ ] Triggers working
- [ ] Stats cache table created
- [ ] Scheduled jobs configured

### API Endpoints

- [ ] Dashboard stats endpoint working
- [ ] Performance chart endpoint working
- [ ] All request GET endpoints working
- [ ] All response GET endpoints working
- [ ] All offers GET endpoints working
- [ ] All advertisers GET endpoints working
- [ ] All publishers GET endpoints working
- [ ] Brand guidelines endpoints working (GET/PUT)
- [ ] Pagination working correctly
- [ ] Filtering working correctly
- [ ] Search working correctly
- [ ] All POST endpoints working
- [ ] Bulk update endpoint working
- [ ] Pull from API endpoints working

### Business Logic

- [ ] Status transitions validated
- [ ] Statistics calculations accurate
- [ ] Trend calculations accurate
- [ ] Historical data accurate
- [ ] Chart aggregations accurate

### Infrastructure

- [ ] Error handling working
- [ ] Authentication working
- [ ] Authorization working
- [ ] Caching working
- [ ] Rate limiting working
- [ ] Load tested
- [ ] Security audit completed

---

## Questions?

For detailed implementation guides, error codes, SQL examples, and more, see:

- [Backend_Implementation_TODOs.md](./Backend_Implementation_TODOs.md) - Complete implementation guide
- [Development_Docs.md](./Development_Docs.md) - Project architecture documentation

---

**Note:** All TODO comments are marked with `TODO: BACKEND` prefix in the codebase for easy searching:

```bash
# Find all backend TODOs
grep -r "TODO: BACKEND" features/ app/
```

## Recent Updates (Latest)

### Comprehensive Backend TODOs Added

All components now include detailed backend integration documentation:

1. **BulkEditModal.tsx** - Complete bulk update API specification
2. **OfferDetailsModal.tsx** - Offer update with brand guidelines
3. **BrandGuidelinesModal.tsx** - Brand guidelines CRUD operations
4. **Offers.tsx** - Pull from API functionality
5. **Advertiser.tsx** - Pull from API and edit details
6. **Publisher.tsx** - Edit details functionality
7. **offers.service.ts** - All service functions with detailed API specs

Each TODO includes:

- Complete API endpoint specifications
- Request/response formats
- Error handling requirements
- Business rules and validation
- File upload handling (FormData, multipart/form-data)
- Performance considerations
- Implementation examples

See [Backend_Implementation_TODOs.md](./Backend_Implementation_TODOs.md) for complete details.
