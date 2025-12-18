# Backend Implementation TODOs

## Table of Contents

1. [Database Schema Design](#database-schema-design)
2. [API Endpoints](#api-endpoints)
3. [Authentication & Authorization](#authentication--authorization)
4. [Business Logic & Workflows](#business-logic--workflows)
5. [Error Handling & Validation](#error-handling--validation)
6. [Performance & Optimization](#performance--optimization)
7. [Security Requirements](#security-requirements)
8. [Testing Requirements](#testing-requirements)
9. [Monitoring & Logging](#monitoring--logging)
10. [Deployment Checklist](#deployment-checklist)

---

## Database Schema Design

### 1. Publisher Requests Table

```sql
CREATE TABLE publisher_requests (
  id VARCHAR(255) PRIMARY KEY,
  date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  advertiser_name VARCHAR(255) NOT NULL,
  affiliate_id VARCHAR(50) NOT NULL,
  priority ENUM('High Priority', 'Medium Priority') NOT NULL,
  offer_id VARCHAR(50) NOT NULL,
  offer_name TEXT NOT NULL,
  client_id VARCHAR(50) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  creative_type VARCHAR(100) NOT NULL,
  creative_count INT NOT NULL,
  from_lines_count INT NOT NULL,
  subject_lines_count INT NOT NULL,
  status ENUM('new', 'pending', 'approved', 'rejected', 'sent-back') NOT NULL DEFAULT 'new',
  approval_stage ENUM('admin', 'advertiser', 'completed') NOT NULL DEFAULT 'admin',
  parent_request_id VARCHAR(255),
  child_response_id VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255),

  -- Foreign Keys
  FOREIGN KEY (parent_request_id) REFERENCES advertiser_responses(id) ON DELETE SET NULL,
  FOREIGN KEY (child_response_id) REFERENCES advertiser_responses(id) ON DELETE SET NULL,

  -- Indexes for Performance
  INDEX idx_status_approval (status, approval_stage),
  INDEX idx_date (date DESC),
  INDEX idx_affiliate_id (affiliate_id),
  INDEX idx_created_at (created_at DESC),
  INDEX idx_offer_id (offer_id),
  INDEX idx_client_id (client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2. Advertiser Responses Table

```sql
CREATE TABLE advertiser_responses (
  id VARCHAR(255) PRIMARY KEY,
  date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  advertiser_name VARCHAR(255) NOT NULL,
  affiliate_id VARCHAR(50) NOT NULL,
  priority ENUM('High Priority', 'Medium Priority') NOT NULL,
  offer_id VARCHAR(50) NOT NULL,
  offer_name TEXT NOT NULL,
  client_id VARCHAR(50) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  creative_type VARCHAR(100) NOT NULL,
  creative_count INT NOT NULL,
  from_lines_count INT NOT NULL,
  subject_lines_count INT NOT NULL,
  status ENUM('new', 'pending', 'approved', 'rejected', 'sent-back') NOT NULL DEFAULT 'new',
  approval_stage ENUM('admin', 'advertiser', 'completed') NOT NULL DEFAULT 'advertiser',
  parent_request_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255),

  -- Foreign Keys
  FOREIGN KEY (parent_request_id) REFERENCES publisher_requests(id) ON DELETE CASCADE,

  -- Indexes
  INDEX idx_status_approval (status, approval_stage),
  INDEX idx_parent_request (parent_request_id),
  INDEX idx_date (date DESC),
  INDEX idx_advertiser_name (advertiser_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3. Request Status History Table

```sql
CREATE TABLE request_status_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  request_id VARCHAR(255) NOT NULL,
  request_type ENUM('publisher_request', 'advertiser_response') NOT NULL,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  old_approval_stage VARCHAR(50),
  new_approval_stage VARCHAR(50) NOT NULL,
  action_by VARCHAR(255) NOT NULL,
  action_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  comments TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Indexes
  INDEX idx_request_id (request_id),
  INDEX idx_action_timestamp (action_timestamp DESC),
  INDEX idx_action_by (action_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 4. Database Constraints & Triggers

```sql
-- Trigger to log status changes automatically
DELIMITER //

CREATE TRIGGER before_publisher_request_update
BEFORE UPDATE ON publisher_requests
FOR EACH ROW
BEGIN
  IF OLD.status != NEW.status OR OLD.approval_stage != NEW.approval_stage THEN
    INSERT INTO request_status_history (
      request_id,
      request_type,
      old_status,
      new_status,
      old_approval_stage,
      new_approval_stage,
      action_by
    ) VALUES (
      NEW.id,
      'publisher_request',
      OLD.status,
      NEW.status,
      OLD.approval_stage,
      NEW.approval_stage,
      NEW.updated_by
    );
  END IF;
END//

CREATE TRIGGER before_advertiser_response_update
BEFORE UPDATE ON advertiser_responses
FOR EACH ROW
BEGIN
  IF OLD.status != NEW.status OR OLD.approval_stage != NEW.approval_stage THEN
    INSERT INTO request_status_history (
      request_id,
      request_type,
      old_status,
      new_status,
      old_approval_stage,
      new_approval_stage,
      action_by
    ) VALUES (
      NEW.id,
      'advertiser_response',
      OLD.status,
      NEW.status,
      OLD.approval_stage,
      NEW.approval_stage,
      NEW.updated_by
    );
  END IF;
END//

DELIMITER ;
```

### 5. Soft Delete Support (Optional)

```sql
-- Add deleted_at column for soft deletes
ALTER TABLE publisher_requests ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE advertiser_responses ADD COLUMN deleted_at TIMESTAMP NULL;

-- Create index on deleted_at
CREATE INDEX idx_deleted_at ON publisher_requests(deleted_at);
CREATE INDEX idx_deleted_at ON advertiser_responses(deleted_at);
```

### 6. Dashboard Statistics Cache Table

```sql
-- Pre-aggregated statistics for dashboard performance
CREATE TABLE dashboard_stats_cache (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  stat_date DATE NOT NULL,
  stat_hour TINYINT NOT NULL,
  total_assets INT NOT NULL DEFAULT 0,
  new_requests INT NOT NULL DEFAULT 0,
  approved_assets INT NOT NULL DEFAULT 0,
  rejected_assets INT NOT NULL DEFAULT 0,
  pending_approval INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_date_hour (stat_date, stat_hour),
  INDEX idx_stat_date (stat_date DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Scheduled job to populate this table every hour
-- Example stored procedure:
DELIMITER //

CREATE PROCEDURE update_dashboard_stats_cache()
BEGIN
  DECLARE current_date DATE;
  DECLARE current_hour TINYINT;

  SET current_date = CURDATE();
  SET current_hour = HOUR(NOW());

  INSERT INTO dashboard_stats_cache (
    stat_date,
    stat_hour,
    total_assets,
    new_requests,
    approved_assets,
    rejected_assets,
    pending_approval
  )
  SELECT
    current_date,
    current_hour,
    (SELECT COUNT(*) FROM publisher_requests WHERE DATE(created_at) = current_date AND HOUR(created_at) = current_hour) +
    (SELECT COUNT(*) FROM advertiser_responses WHERE DATE(created_at) = current_date AND HOUR(created_at) = current_hour),
    (SELECT COUNT(*) FROM publisher_requests WHERE status = 'new' AND approval_stage = 'admin' AND DATE(created_at) = current_date AND HOUR(created_at) = current_hour),
    (SELECT COUNT(*) FROM publisher_requests WHERE status = 'approved' AND approval_stage = 'completed' AND DATE(created_at) = current_date AND HOUR(created_at) = current_hour),
    (SELECT COUNT(*) FROM publisher_requests WHERE status = 'rejected' AND DATE(created_at) = current_date AND HOUR(created_at) = current_hour) +
    (SELECT COUNT(*) FROM advertiser_responses WHERE status = 'rejected' AND DATE(created_at) = current_date AND HOUR(created_at) = current_hour),
    (SELECT COUNT(*) FROM publisher_requests WHERE status IN ('new', 'pending') AND DATE(created_at) = current_date AND HOUR(created_at) = current_hour) +
    (SELECT COUNT(*) FROM advertiser_responses WHERE status = 'pending' AND DATE(created_at) = current_date AND HOUR(created_at) = current_hour)
  ON DUPLICATE KEY UPDATE
    total_assets = VALUES(total_assets),
    new_requests = VALUES(new_requests),
    approved_assets = VALUES(approved_assets),
    rejected_assets = VALUES(rejected_assets),
    pending_approval = VALUES(pending_approval),
    updated_at = CURRENT_TIMESTAMP;
END//

DELIMITER ;

-- Schedule this procedure to run every hour via cron or database scheduler
```

---

## API Endpoints

### Dashboard Statistics Endpoints

#### 1. Get Dashboard Stats

```
GET /api/admin/dashboard/stats

Response:
{
  "success": true,
  "data": {
    "stats": [
      {
        "title": "Total Assets",
        "value": 1263,
        "trend": {
          "trendTextValue": "Today",
          "textValue": "43%",
          "trendIconValue": "trending-up"
        },
        "historicalData": [
          { "label": "Yesterday", "value": "400" },
          { "label": "Current Month", "value": "25k" },
          { "label": "Last Month", "value": "10.8k" }
        ]
      },
      {
        "title": "New Requests",
        "value": 201,
        "trend": {
          "trendTextValue": "Today",
          "textValue": "13%",
          "trendIconValue": "trending-down"
        },
        "historicalData": [...]
      },
      {
        "title": "Approved Assets",
        "value": 552,
        "trend": {...},
        "historicalData": [...]
      },
      {
        "title": "Rejected Assets",
        "value": 210,
        "trend": {...},
        "historicalData": [...]
      },
      {
        "title": "Pending Approval",
        "value": 300,
        "trend": {...},
        "historicalData": [...]
      }
    ]
  },
  "timestamp": "2024-12-20T10:30:00Z"
}

Statistics Calculation:

Total Assets:
  Query: SELECT COUNT(*) FROM (
           SELECT id FROM publisher_requests
           UNION ALL
           SELECT id FROM advertiser_responses
         ) AS total_assets;

New Requests:
  Query: SELECT COUNT(*) FROM publisher_requests
         WHERE status = 'new' AND approval_stage = 'admin';

Approved Assets:
  Query: SELECT COUNT(*) FROM publisher_requests
         WHERE status = 'approved' AND approval_stage = 'completed';

Rejected Assets:
  Query: SELECT COUNT(*) FROM (
           SELECT id FROM publisher_requests WHERE status = 'rejected'
           UNION ALL
           SELECT id FROM advertiser_responses WHERE status = 'rejected'
         ) AS rejected_assets;

Pending Approval:
  Query: SELECT COUNT(*) FROM (
           SELECT id FROM publisher_requests WHERE status IN ('new', 'pending')
           UNION ALL
           SELECT id FROM advertiser_responses WHERE status = 'pending'
         ) AS pending_assets;

Trend Calculation:
  percentage_change = ((today_count - yesterday_count) / yesterday_count) * 100
  trend_icon = percentage_change >= 0 ? "trending-up" : "trending-down"

Historical Data Queries:
  Yesterday: WHERE DATE(created_at) = CURDATE() - INTERVAL 1 DAY
  Current Month: WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())
  Last Month: WHERE MONTH(created_at) = MONTH(CURDATE() - INTERVAL 1 MONTH)

Cache: Key 'admin:dashboard:stats', TTL 2 minutes
```

#### 2. Get Performance Chart Data

```
GET /api/admin/dashboard/performance?comparisonType={type}

Query Parameters:
- comparisonType: "Today vs Yesterday" | "Today vs Last Week" | "Current Week vs Last Week" | "Current Month vs Last Month"

Response:
{
  "success": true,
  "data": {
    "comparisonType": "Today vs Yesterday",
    "xAxisLabel": "Time",
    "data": [
      { "label": "00:00", "current": 1250, "previous": 980 },
      { "label": "01:00", "current": 890, "previous": 1100 },
      { "label": "02:00", "current": 1100, "previous": 950 },
      // ... 24 data points total for hourly
    ]
  },
  "timestamp": "2024-12-20T10:30:00Z"
}

Data Points by Comparison Type:
- "Today vs Yesterday": 24 points (hourly 00:00-23:00)
- "Today vs Last Week": 24 points (hourly 00:00-23:00)
- "Current Week vs Last Week": 7 points (Sun-Sat)
- "Current Month vs Last Month": 31 points (01-31)

SQL Examples:

Hourly Aggregation (Today vs Yesterday):
  SELECT
    HOUR(created_at) as hour,
    DATE(created_at) as date,
    COUNT(*) as count
  FROM publisher_requests
  WHERE DATE(created_at) IN (CURDATE(), CURDATE() - INTERVAL 1 DAY)
  GROUP BY DATE(created_at), HOUR(created_at)
  ORDER BY date, hour;

Daily Aggregation (Current Week vs Last Week):
  SELECT
    DAYOFWEEK(created_at) as day_of_week,
    WEEK(created_at, 1) as week_number,
    COUNT(*) as count
  FROM publisher_requests
  WHERE created_at >= CURDATE() - INTERVAL 14 DAY
  GROUP BY WEEK(created_at, 1), DAYOFWEEK(created_at);

Monthly Aggregation (Current Month vs Last Month):
  SELECT
    DAY(created_at) as day_of_month,
    MONTH(created_at) as month,
    YEAR(created_at) as year,
    COUNT(*) as count
  FROM publisher_requests
  WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 2 MONTH)
  GROUP BY YEAR(created_at), MONTH(created_at), DAY(created_at);

Important:
- Fill missing data points with 0
- Ensure consistent data point counts
- Pre-aggregate for performance
- Cache with 5-15 minute TTL
```

### Publisher Requests Endpoints

#### 1. Get All Requests (with Pagination & Filtering)

```
GET /api/admin/requests

Query Parameters:
- page: number (default: 1)
- limit: number (default: 20, max: 100)
- status: string[] (filter by status: "new", "pending", "approved", "rejected", "sent-back")
- approvalStage: string[] (filter by stage: "admin", "advertiser", "completed")
- priority: string[] (filter by priority: "High Priority", "Medium Priority")
- search: string (search in advertiserName, offerId, clientName, offerName)
- sortBy: string (options: "date", "priority", "advertiserName", "createdAt")
- sortOrder: "asc" | "desc" (default: "desc")
- dateFrom: ISO8601 date (filter from date)
- dateTo: ISO8601 date (filter to date)

Response:
{
  "success": true,
  "data": [
    {
      "id": "req-1",
      "date": "2024-12-20T10:30:00Z",
      "advertiserName": "Amazon Affiliates",
      "affiliateId": "AFF-8901",
      "priority": "High Priority",
      "offerId": "5001",
      "offerName": "RETAIL - E-COMMERCE...",
      "clientId": "CLI-1001",
      "clientName": "Global Publishers Network",
      "creativeType": "Email",
      "creativeCount": 3,
      "fromLinesCount": 2,
      "subjectLinesCount": 3,
      "status": "new",
      "approvalStage": "admin",
      "parentRequestId": null,
      "childResponseId": "resp-1",
      "createdAt": "2024-12-20T10:30:00Z",
      "updatedAt": "2024-12-20T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}

Error Responses:
- 401: Unauthorized (invalid/expired token)
- 403: Forbidden (not admin)
- 400: Bad Request (invalid query parameters)
- 500: Internal Server Error
```

#### 2. Get Recent Publisher Requests

```
GET /api/admin/requests/recent?limit=3

Response: Same as above but limited to most recent requests
```

#### 3. Get Request by ID

```
GET /api/admin/requests/:id

Response:
{
  "success": true,
  "data": {
    "id": "req-1",
    // ... all request fields
    "statusHistory": [
      {
        "oldStatus": null,
        "newStatus": "new",
        "oldApprovalStage": null,
        "newApprovalStage": "admin",
        "actionBy": "system",
        "actionTimestamp": "2024-12-20T10:30:00Z",
        "comments": "Request created"
      }
    ],
    "relatedResponse": {
      // response object if exists
    }
  }
}

Error Responses:
- 404: Request not found
- 401: Unauthorized
- 403: Forbidden
```

#### 4. Approve and Forward Request

```
POST /api/admin/requests/:id/approve-and-forward

Request Headers:
- Authorization: Bearer {JWT_TOKEN}
- Content-Type: application/json

Request Body:
{
  "actionBy": "admin-user-id",
  "comments": "Approved after review" // optional
}

Response:
{
  "success": true,
  "data": {
    "request": {
      // updated request object with status: "pending", approvalStage: "advertiser"
    },
    "response": {
      // newly created advertiser response object
    }
  },
  "message": "Request approved and forwarded to advertiser"
}

Business Logic:
1. Validate request exists and status is "new" with approvalStage "admin"
2. Create new advertiser_response record with:
   - status: "pending"
   - approvalStage: "advertiser"
   - parent_request_id: request.id
3. Update publisher_request:
   - status: "pending"
   - approvalStage: "advertiser"
   - child_response_id: response.id
   - updated_by: actionBy
4. Log action in request_status_history
5. Send notification to advertiser
6. Commit transaction
7. Return updated objects

Error Responses:
- 400: Invalid status transition (e.g., already approved)
- 404: Request not found
- 401: Unauthorized
- 403: Forbidden
- 409: Conflict (request already processed)
- 500: Internal Server Error
```

#### 5. Reject and Send Back Request

```
POST /api/admin/requests/:id/reject-and-send-back

Request Body:
{
  "actionBy": "admin-user-id",
  "comments": "Rejection reason" // required for rejections
}

Response:
{
  "success": true,
  "data": {
    // updated request object with status: "rejected"
  },
  "message": "Request rejected and sent back to publisher"
}

Business Logic:
1. Validate request exists
2. Update status to "rejected"
3. Set updated_by
4. Log action with comments
5. Send notification to publisher
6. Return updated object

Error Responses: Same as approve endpoint
```

### Advertiser Responses Endpoints

#### 6. Get All Advertiser Responses

```
GET /api/admin/responses

Query Parameters: Same as /api/admin/requests

Filter Logic:
- Exclude responses with status="sent-back" AND approvalStage="advertiser"
  (these appear in /requests "Sent Back" tab)

Response: Same structure as /api/admin/requests
```

#### 7. Get Recent Advertiser Responses

```
GET /api/admin/responses/recent?limit=3

Response: Same as requests endpoint
```

#### 8. Get Response by ID

```
GET /api/admin/responses/:id

Response: Same structure as get request by ID
```

#### 9. Reject and Send Back Response (from Advertiser to Admin)

```
POST /api/admin/responses/:id/reject-and-send-back

Request Body:
{
  "actionBy": "admin-user-id",
  "comments": "Reason for sending back"
}

Response:
{
  "success": true,
  "data": {
    // updated response object with status: "sent-back"
  },
  "message": "Response rejected and sent back to advertiser"
}

Business Logic:
1. Validate response exists
2. Update status to "sent-back"
3. Keep approvalStage as "advertiser"
4. This makes response appear in admin's /requests "Sent Back" tab
5. Log action
6. Send notification to advertiser
```

### Related Requests/Responses Endpoints

#### 10. Get Related Response

```
GET /api/admin/requests/:id/related-response

Returns the advertiser response linked to a publisher request via childResponseId
```

#### 11. Get Related Request

```
GET /api/admin/responses/:id/related-request

Returns the publisher request linked to an advertiser response via parentRequestId
```

---

## Authentication & Authorization

### 1. JWT Token Structure

```json
{
  "userId": "user-123",
  "email": "admin@example.com",
  "role": "admin",
  "permissions": [
    "requests:read",
    "requests:write",
    "responses:read",
    "responses:write"
  ],
  "iat": 1703001234,
  "exp": 1703087634
}
```

### 2. Authentication Middleware

```typescript
// Pseudo-code for authentication middleware
async function authenticateRequest(request: Request): Promise<User | null> {
  // 1. Extract JWT token from Authorization header
  const token = extractBearerToken(request.headers.authorization);

  if (!token) {
    throw new AuthenticationError("No token provided");
  }

  // 2. Verify JWT signature
  const decoded = await verifyJWT(token, process.env.JWT_SECRET);

  // 3. Check token expiration
  if (decoded.exp < Date.now() / 1000) {
    throw new AuthenticationError("Token expired");
  }

  // 4. Fetch user from database to ensure account still exists and is active
  const user = await db.users.findById(decoded.userId);

  if (!user || !user.isActive) {
    throw new AuthenticationError("Invalid user");
  }

  // 5. Validate role from database (don't trust JWT alone)
  if (user.role !== decoded.role) {
    throw new AuthenticationError("Role mismatch");
  }

  return user;
}
```

### 3. Authorization Logic

```typescript
// Role-based access control
const ROLE_PERMISSIONS = {
  admin: {
    requests: ["read", "write", "approve", "reject"],
    responses: ["read", "write", "reject"],
  },
  publisher: {
    requests: ["read", "create"], // Can only see their own
    responses: [],
  },
  advertiser: {
    requests: ["read"], // Can only see forwarded to them
    responses: ["read", "write", "approve", "reject"],
  },
};

function authorizeAction(
  user: User,
  resource: string,
  action: string
): boolean {
  const permissions = ROLE_PERMISSIONS[user.role];
  return permissions[resource]?.includes(action) ?? false;
}
```

### 4. Session Management

```typescript
// Store sessions in Redis
interface Session {
  sessionId: string;
  userId: string;
  role: string;
  createdAt: Date;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
}

// Session operations
async function createSession(user: User, request: Request): Promise<string> {
  const sessionId = generateSecureToken();
  const session: Session = {
    sessionId,
    userId: user.id,
    role: user.role,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    ipAddress: request.ip,
    userAgent: request.headers["user-agent"],
  };

  await redis.set(`session:${sessionId}`, JSON.stringify(session), "EX", 86400);
  return sessionId;
}

async function validateSession(sessionId: string): Promise<Session | null> {
  const data = await redis.get(`session:${sessionId}`);
  if (!data) return null;

  const session = JSON.parse(data);
  if (new Date(session.expiresAt) < new Date()) {
    await redis.del(`session:${sessionId}`);
    return null;
  }

  return session;
}

async function revokeSession(sessionId: string): Promise<void> {
  await redis.del(`session:${sessionId}`);
}
```

---

## Business Logic & Workflows

### Request Approval Workflow

```
Publisher → Submits Request
           ↓
        [status: "new", approvalStage: "admin"]
           ↓
Admin → Reviews Request
       ↓                    ↓
   Approve             Reject
       ↓                    ↓
[status: "pending"    [status: "rejected"]
approvalStage:        → Send back to Publisher
"advertiser"]
       ↓
Creates Advertiser Response
[status: "pending", approvalStage: "advertiser"]
       ↓
Advertiser Reviews
       ↓                    ↓
   Approve             Reject/Send Back
       ↓                    ↓
[status: "approved"   [status: "sent-back"]
approvalStage:        → Appears in Admin's
"completed"]             /requests "Sent Back" tab
       ↓
  COMPLETED
```

### State Transition Validation

```typescript
// Valid state transitions
const VALID_TRANSITIONS = {
  new: {
    admin: ["pending", "rejected", "sent-back"],
  },
  pending: {
    advertiser: ["approved", "rejected", "sent-back"],
  },
  "sent-back": {
    advertiser: ["rejected"], // Admin can reject sent-back responses
    admin: [], // Cannot transition from sent-back at admin stage
  },
  approved: {
    completed: [], // Final state, no transitions
  },
  rejected: {
    admin: [], // Final state
    advertiser: [], // Final state
  },
};

function validateTransition(
  currentStatus: string,
  currentStage: string,
  newStatus: string,
  newStage: string
): boolean {
  const validNextStates = VALID_TRANSITIONS[currentStatus]?.[currentStage];
  return validNextStates?.includes(newStatus) ?? false;
}
```

### Business Rules

1. **Request Creation**
   - Must have valid publisher ID
   - All required fields must be present
   - Affiliate ID must exist in system
   - Advertiser must exist in system

2. **Admin Approval**
   - Only requests with status="new" and approvalStage="admin" can be approved
   - Approval creates advertiser response automatically
   - Both request and response records must be updated in a transaction

3. **Admin Rejection**
   - Can reject requests at "new" stage
   - Must provide rejection comments
   - Sends notification to publisher

4. **Advertiser Response**
   - Can approve/reject requests forwarded to them
   - Approval completes the workflow (approvalStage="completed")
   - Rejection/Send-back returns to admin's view

5. **Sent-Back Handling**
   - Responses sent-back by advertiser appear in admin's /requests "Sent Back" tab
   - Admin can only reject these (send back to advertiser again)
   - Requests sent-back by admin go to publisher (not shown in admin's view)

---

## Error Handling & Validation

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Request cannot be approved in current state",
    "details": {
      "currentStatus": "pending",
      "currentApprovalStage": "advertiser",
      "reason": "Only requests with status 'new' at stage 'admin' can be approved"
    }
  },
  "timestamp": "2024-12-20T10:30:00Z",
  "requestId": "req-abc-123"
}
```

### Error Codes

```
Authentication & Authorization:
- AUTH_001: No token provided
- AUTH_002: Invalid token
- AUTH_003: Token expired
- AUTH_004: User not found
- AUTH_005: User inactive
- AUTH_006: Insufficient permissions
- AUTH_007: Role mismatch

Validation:
- VAL_001: Missing required field
- VAL_002: Invalid field format
- VAL_003: Field value out of range
- VAL_004: Invalid enum value

Business Logic:
- BIZ_001: Invalid status transition
- BIZ_002: Request already processed
- BIZ_003: Request not found
- BIZ_004: Related entity not found
- BIZ_005: Conflict with existing data

System:
- SYS_001: Database connection error
- SYS_002: Redis connection error
- SYS_003: External service unavailable
- SYS_004: Internal server error
```

### Input Validation

```typescript
// Example validation schema using Zod
import { z } from "zod";

const ApproveRequestSchema = z.object({
  actionBy: z.string().uuid("Invalid user ID"),
  comments: z.string().max(1000, "Comments too long").optional(),
});

const RejectRequestSchema = z.object({
  actionBy: z.string().uuid("Invalid user ID"),
  comments: z
    .string()
    .min(10, "Rejection reason must be at least 10 characters")
    .max(1000, "Rejection reason too long"),
});

const GetRequestsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .array(z.enum(["new", "pending", "approved", "rejected", "sent-back"]))
    .optional(),
  approvalStage: z
    .array(z.enum(["admin", "advertiser", "completed"]))
    .optional(),
  priority: z.array(z.enum(["High Priority", "Medium Priority"])).optional(),
  search: z.string().max(255).optional(),
  sortBy: z
    .enum(["date", "priority", "advertiserName", "createdAt"])
    .default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
```

---

## Performance & Optimization

### 1. Database Indexing Strategy

```sql
-- Critical indexes for performance
CREATE INDEX idx_composite_status_stage_date ON publisher_requests(status, approval_stage, date DESC);
CREATE INDEX idx_search_fields ON publisher_requests(advertiser_name, offer_name(100), client_name);

-- Full-text search index
ALTER TABLE publisher_requests ADD FULLTEXT INDEX ft_search (advertiser_name, offer_name, client_name);
```

### 2. Caching Strategy

```typescript
// Redis cache configuration
const CACHE_CONFIG = {
  recentRequests: {
    key: "admin:requests:recent",
    ttl: 60, // 1 minute
  },
  recentResponses: {
    key: "admin:responses:recent",
    ttl: 60, // 1 minute
  },
  requestById: {
    keyPrefix: "admin:request:",
    ttl: 300, // 5 minutes
  },
  requestList: {
    keyPrefix: "admin:requests:list:",
    ttl: 120, // 2 minutes
  },
};

// Cache implementation
async function getCachedOrFetch<T>(
  cacheKey: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch from database
  const data = await fetchFn();

  // Store in cache
  await redis.set(cacheKey, JSON.stringify(data), "EX", ttl);

  return data;
}

// Cache invalidation
async function invalidateRequestCache(requestId: string): Promise<void> {
  const patterns = [
    "admin:requests:recent",
    "admin:requests:list:*",
    `admin:request:${requestId}`,
  ];

  for (const pattern of patterns) {
    if (pattern.includes("*")) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } else {
      await redis.del(pattern);
    }
  }
}
```

### 3. Query Optimization

```sql
-- Optimized query for getting all requests with filtering
SELECT pr.*
FROM publisher_requests pr
WHERE
  pr.deleted_at IS NULL
  AND (? IS NULL OR pr.status = ?)
  AND (? IS NULL OR pr.approval_stage = ?)
  AND (
    ? IS NULL OR
    pr.advertiser_name LIKE ? OR
    pr.offer_name LIKE ? OR
    pr.client_name LIKE ?
  )
ORDER BY pr.date DESC
LIMIT ? OFFSET ?;

-- Use EXPLAIN to analyze query performance
EXPLAIN SELECT ...;
```

### 4. Pagination Optimization

```typescript
// Cursor-based pagination for better performance on large datasets
interface CursorPagination {
  cursor?: string; // Last item's ID from previous page
  limit: number;
}

async function getRequestsWithCursor(
  filters: RequestFilters,
  pagination: CursorPagination
): Promise<{ data: Request[]; nextCursor: string | null }> {
  const query = `
    SELECT * FROM publisher_requests
    WHERE (? IS NULL OR id > ?)
    ORDER BY id ASC
    LIMIT ?
  `;

  const results = await db.query(query, [
    pagination.cursor,
    pagination.cursor,
    pagination.limit + 1, // Fetch one extra to check if there's a next page
  ]);

  const hasNextPage = results.length > pagination.limit;
  const data = hasNextPage ? results.slice(0, -1) : results;
  const nextCursor = hasNextPage ? data[data.length - 1].id : null;

  return { data, nextCursor };
}
```

---

## Security Requirements

### 1. Input Sanitization

```typescript
import { escape } from "mysql2";
import xss from "xss";

function sanitizeInput(input: any): any {
  if (typeof input === "string") {
    // Remove XSS attacks
    return xss(input.trim());
  }
  return input;
}

// Always use parameterized queries
const query = "SELECT * FROM publisher_requests WHERE id = ?";
const result = await db.query(query, [requestId]); // Safe from SQL injection
```

### 2. Rate Limiting

```typescript
// Redis-based rate limiting
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

const RATE_LIMITS = {
  general: { windowMs: 60000, maxRequests: 100 }, // 100 req/min
  action: { windowMs: 60000, maxRequests: 20 }, // 20 actions/min
};

async function checkRateLimit(
  userId: string,
  action: string,
  config: RateLimitConfig
): Promise<boolean> {
  const key = `ratelimit:${userId}:${action}`;
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, Math.ceil(config.windowMs / 1000));
  }

  return current <= config.maxRequests;
}
```

### 3. CORS Configuration

```typescript
const CORS_CONFIG = {
  origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86400, // 24 hours
};
```

### 4. Security Headers

```typescript
const SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Content-Security-Policy": "default-src 'self'",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};
```

---

## Testing Requirements

### 1. Unit Tests

```typescript
// Example unit test for status transition validation
describe("Status Transition Validation", () => {
  test("should allow transition from new to pending", () => {
    expect(validateTransition("new", "admin", "pending", "advertiser")).toBe(
      true
    );
  });

  test("should reject invalid transition from approved to new", () => {
    expect(validateTransition("approved", "completed", "new", "admin")).toBe(
      false
    );
  });

  test("should allow rejection at new stage", () => {
    expect(validateTransition("new", "admin", "rejected", "admin")).toBe(true);
  });
});
```

### 2. Integration Tests

```typescript
// Example integration test for approve endpoint
describe("POST /api/admin/requests/:id/approve-and-forward", () => {
  let authToken: string;
  let testRequest: Request;

  beforeAll(async () => {
    authToken = await getTestAuthToken("admin");
    testRequest = await createTestRequest();
  });

  test("should approve request and create response", async () => {
    const response = await fetch(
      `/api/admin/requests/${testRequest.id}/approve-and-forward`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          actionBy: "test-admin-id",
          comments: "Test approval",
        }),
      }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.request.status).toBe("pending");
    expect(data.data.request.approvalStage).toBe("advertiser");
    expect(data.data.response).toBeDefined();
  });

  test("should reject approval of already processed request", async () => {
    const response = await fetch(
      `/api/admin/requests/${testRequest.id}/approve-and-forward`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          actionBy: "test-admin-id",
        }),
      }
    );

    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.error.code).toBe("BIZ_002");
  });

  afterAll(async () => {
    await cleanupTestData();
  });
});
```

### 3. Load Testing

```typescript
// Example load test using k6
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 20 }, // Ramp up to 20 users
    { duration: "1m", target: 50 }, // Stay at 50 users for 1 minute
    { duration: "30s", target: 0 }, // Ramp down to 0 users
  ],
};

export default function () {
  const url = "http://localhost:3000/api/admin/requests";
  const headers = {
    Authorization: `Bearer ${__ENV.AUTH_TOKEN}`,
  };

  const response = http.get(url, { headers });

  check(response, {
    "status is 200": (r) => r.status === 200,
    "response time < 500ms": (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

---

## Monitoring & Logging

### 1. Logging Strategy

```typescript
// Structured logging with context
interface LogContext {
  requestId: string;
  userId?: string;
  action: string;
  resource: string;
  timestamp: Date;
  duration?: number;
  error?: Error;
}

function logAction(
  level: "info" | "warn" | "error",
  context: LogContext,
  message: string
) {
  const logEntry = {
    level,
    message,
    ...context,
    timestamp: context.timestamp.toISOString(),
  };

  console.log(JSON.stringify(logEntry));

  // Also send to logging service (e.g., CloudWatch, Datadog, etc.)
  if (process.env.NODE_ENV === "production") {
    sendToLoggingService(logEntry);
  }
}

// Usage example
logAction(
  "info",
  {
    requestId: "req-123",
    userId: "admin-456",
    action: "approve",
    resource: "publisher_requests",
    timestamp: new Date(),
    duration: 150,
  },
  "Request approved successfully"
);
```

### 2. Metrics to Track

```typescript
// Key metrics to monitor
const METRICS = {
  requestProcessingTime: "request.processing.time",
  databaseQueryTime: "database.query.time",
  cacheHitRate: "cache.hit.rate",
  apiRequestCount: "api.request.count",
  apiErrorCount: "api.error.count",
  authFailureCount: "auth.failure.count",
  requestApprovals: "business.request.approvals",
  requestRejections: "business.request.rejections",
  activeUsers: "users.active.count",
};

// Send metrics to monitoring service
function recordMetric(
  metric: string,
  value: number,
  tags?: Record<string, string>
) {
  // Example using StatsD/Datadog
  statsd.gauge(metric, value, tags);
}
```

### 3. Health Check Endpoint

```typescript
// GET /api/health
interface HealthCheckResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  checks: {
    database: HealthStatus;
    redis: HealthStatus;
    services: HealthStatus;
  };
}

interface HealthStatus {
  status: "up" | "down";
  responseTime?: number;
  error?: string;
}

async function healthCheck(): Promise<HealthCheckResponse> {
  const checks = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkExternalServices(),
  ]);

  const allHealthy = checks.every((check) => check.status === "up");
  const anyDown = checks.some((check) => check.status === "down");

  return {
    status: anyDown ? "unhealthy" : allHealthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: checks[0],
      redis: checks[1],
      services: checks[2],
    },
  };
}
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Load tests completed successfully
- [ ] Security audit completed
- [ ] Database migrations prepared
- [ ] Environment variables configured
- [ ] API documentation updated
- [ ] Rollback plan documented

### Database Setup

- [ ] Create database schema
- [ ] Run migrations
- [ ] Create indexes
- [ ] Set up database triggers
- [ ] Configure database backups
- [ ] Set up read replicas (if needed)
- [ ] Test database connection pooling

### Redis Setup

- [ ] Configure Redis instance
- [ ] Set up Redis persistence
- [ ] Configure Redis clustering (if needed)
- [ ] Test Redis failover

### Application Deployment

- [ ] Deploy application to staging
- [ ] Run smoke tests on staging
- [ ] Deploy to production
- [ ] Verify health checks
- [ ] Monitor error rates
- [ ] Verify logging is working

### Post-Deployment

- [ ] Monitor performance metrics
- [ ] Check error logs
- [ ] Verify cache hit rates
- [ ] Test critical user flows
- [ ] Update runbook documentation
- [ ] Notify team of deployment

### Monitoring Setup

- [ ] Configure alerting thresholds
- [ ] Set up on-call rotation
- [ ] Create monitoring dashboards
- [ ] Test alert notifications
- [ ] Document incident response procedures

---

## Environment Variables

```bash
# Database
DATABASE_URL=mysql://user:password@localhost:3306/assets_exchange
DATABASE_POOL_SIZE=10

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRATION=24h

# Application
NODE_ENV=production
PORT=3000
API_BASE_URL=https://api.yourapp.com

# CORS
ALLOWED_ORIGINS=https://yourapp.com,https://www.yourapp.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_TO_FILE=true

# Monitoring
DATADOG_API_KEY=your_datadog_api_key
SENTRY_DSN=your_sentry_dsn

# Email Notifications
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=notifications@yourapp.com
SMTP_PASSWORD=your_smtp_password

# Feature Flags
ENABLE_CACHING=true
ENABLE_RATE_LIMITING=true
```

---

## Additional Notes

### Data Migration

When transitioning from mock data to real backend:

1. **Remove Mock Files**
   - Delete `/features/admin/models/request.model.ts`
   - Delete `/features/admin/models/response.model.ts`

2. **Update Service Layer**
   - Replace all mock data imports with API calls
   - Add error handling for network failures
   - Implement retry logic for failed requests

3. **Update Frontend Components**
   - Add loading states
   - Add error states
   - Implement optimistic updates where appropriate

### Notifications

Implement notification system for:

- Request approved by admin → Notify advertiser
- Request rejected by admin → Notify publisher
- Response approved by advertiser → Notify admin & publisher
- Response rejected by advertiser → Notify admin

### Future Enhancements

- [ ] WebSocket support for real-time updates
- [ ] File attachments for requests/responses
- [ ] Bulk operations (approve/reject multiple)
- [ ] Advanced analytics dashboard
- [ ] Export functionality (CSV, PDF)
- [ ] Email notifications
- [ ] Slack/Teams integrations
- [ ] Automated workflow rules
- [ ] SLA tracking and alerts

---

## Contact Information

For backend implementation questions, contact:

- Backend Team Lead: [email]
- DevOps Team: [email]
- Database Team: [email]

---

**Last Updated:** December 2024
**Version:** 1.0.0
