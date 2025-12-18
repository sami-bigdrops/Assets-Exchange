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

### 3. UI Components

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
4. Pagination and filtering
5. Search functionality
6. Caching layer
7. Basic error handling

### Phase 3: Actions (Week 5-6)

1. Approve and forward functionality
2. Reject and send back functionality
3. Status history tracking
4. Notifications
5. Transaction management

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
- [ ] Pagination working correctly
- [ ] Filtering working correctly
- [ ] Search working correctly
- [ ] All POST endpoints working

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
