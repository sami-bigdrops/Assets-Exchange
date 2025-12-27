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
11. [Personalization & Color Customization](#personalization--color-customization)

---

## Personalization & Color Customization

**See detailed implementation guide:** [PERSONALIZATION_BACKEND_TODOS.md](./PERSONALIZATION_BACKEND_TODOS.md)

### Quick Summary

- **Database Table**: `color_preferences` (JSONB storage recommended)
- **API Endpoints**: GET/POST/PUT/DELETE `/api/personalization/colors`
- **Data Structure**: Matches `GroupedColors` interface from `components/_variables/variables.ts`
- **Features**: User-level and organization-level color customization
- **Status**: ⏳ Pending Implementation

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

### Offers Management Endpoints

#### 1. Get All Offers

```
GET /api/admin/offers

Query Parameters:
- page: number (default: 1)
- limit: number (default: 20, max: 100)
- status: "Active" | "Inactive" (optional filter)
- visibility: "Public" | "Internal" | "Hidden" (optional filter)
- creationMethod: "Manually" | "API" (optional filter)
- search: string (search by offerName, advName, offerId)
- sortBy: string (options: "id", "offerName", "advName", "status", "createdAt")
- sortOrder: "asc" | "desc" (default: "desc")

Response:
{
  "success": true,
  "data": {
    "offers": [
      {
        "id": "1952",
        "offerName": "INSURANCE - E-FINANCIAL - [Super Sensitive]",
        "advName": "Insurance Pro",
        "createdMethod": "Manually" | "API",
        "status": "Active" | "Inactive",
        "visibility": "Public" | "Internal" | "Hidden"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}

Error Responses:
- 401: Unauthorized
- 403: Forbidden
- 500: Internal server error
```

#### 2. Get Offer by ID

```
GET /api/admin/offers/:id

Response:
{
  "success": true,
  "data": {
    "id": "1952",
    "offerName": "INSURANCE - E-FINANCIAL",
    "advName": "Insurance Pro",
    "createdMethod": "Manually",
    "status": "Active",
    "visibility": "Public",
    "brandGuidelines": {
      "type": "url" | "file" | "text",
      "url": "https://example.com/guidelines",
      "fileUrl": "https://storage.example.com/file.pdf",
      "fileName": "guidelines.pdf",
      "fileSize": 1024000,
      "mimeType": "application/pdf",
      "text": "<p>Rich text content</p>",
      "notes": "Additional notes about brand guidelines"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-20T14:45:00Z",
    "createdBy": "user123",
    "updatedBy": "user456"
  }
}

Error Responses:
- 404: Offer not found
- 401: Unauthorized
- 403: Forbidden
- 500: Internal server error
```

#### 3. Create Offer

```
POST /api/admin/offers

Request Body:
{
  "offerId": "1952",                    // Optional, must be unique if provided
  "offerName": "INSURANCE - E-FINANCIAL", // Required
  "advertiserId": "adv123",              // Required
  "advertiserName": "Insurance Pro",     // Required
  "status": "Active" | "Inactive",       // Required
  "visibility": "Public" | "Internal" | "Hidden", // Required
  "brandGuidelines": {                   // Optional
    "type": "url" | "file" | "text",
    "url": "https://example.com/guidelines", // If type is "url"
    "file": File,                        // If type is "file" - use FormData
    "text": "<p>Rich text content</p>",  // If type is "text"
    "notes": "Additional notes"
  }
}

For file uploads:
- Use multipart/form-data
- Validate file size (max 10MB)
- Validate file type (only .doc, .docx, .pdf)
- Store file in secure storage (S3, Azure Blob, etc.)
- Return file URL or file ID for reference

Response:
{
  "success": true,
  "data": {
    "id": "1952",
    "offerName": "INSURANCE - E-FINANCIAL",
    "advName": "Insurance Pro",
    "createdMethod": "Manually",
    "status": "Active",
    "visibility": "Public",
    "brandGuidelines": {
      "type": "url",
      "url": "https://example.com/guidelines",
      "notes": "Additional notes"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}

Error Responses:
- 400: Validation errors (missing required fields, invalid values)
- 401: Unauthorized
- 403: Forbidden
- 409: Conflict (offerId already exists if provided)
- 413: File too large
- 500: Server error

Business Rules:
- Manually created offers can have "Active" or "Inactive" status
- API-created offers are always "Active"
- If offerId provided, check for uniqueness first
- If no offerId provided, generate unique ID on backend
```

#### 4. Update Offer

```
PUT /api/admin/offers/:id

Request Body:
{
  "offerId": "1952",                     // Only if offer was created manually
  "offerName": "Updated Offer Name",     // Only if offer was created manually
  "advertiserId": "adv123",
  "advertiserName": "Updated Advertiser",
  "status": "Active" | "Inactive",       // Only if offer was created manually
  "visibility": "Public" | "Internal" | "Hidden",
  "brandGuidelines": {                   // Optional
    "type": "url" | "file" | "text",
    "url": "https://example.com/guidelines",
    "file": File,
    "text": "<p>Rich text content</p>",
    "notes": "Additional notes"
  }
}

Business Rules:
- Offer ID and Offer Name can only be updated if createdMethod is "Manually"
- Status can only be updated if createdMethod is "Manually"
- API-created offers: Only visibility, advertiserId, advertiserName, and brandGuidelines can be updated
- Manually-created offers: All fields can be updated
- If replacing existing brand guidelines file, delete old file from storage

Response: Same as Get Offer by ID

Error Responses:
- 400: Validation errors
- 401: Unauthorized
- 403: Forbidden
- 404: Offer not found
- 409: Conflict (offerId already exists if changing offerId)
- 413: File too large
- 500: Server error
```

#### 5. Delete Offer

```
DELETE /api/admin/offers/:id

Response:
{
  "success": true,
  "message": "Offer deleted successfully"
}

Error Responses:
- 404: Offer not found
- 400: Cannot delete (has dependencies)
- 401: Unauthorized
- 403: Forbidden
- 500: Server error

Business Rules:
- Check if offer has associated creative requests
- Decide: Block deletion or cascade delete
- If blocking: Return error with list of dependencies
- If offer has brand guidelines file, delete from storage
- Use soft delete for audit trail (recommended)
```

#### 6. Update Offer Status

```
PATCH /api/admin/offers/:id/status

Request Body:
{
  "status": "Active" | "Inactive"
}

Response: Updated offer object

Error Responses:
- 404: Offer not found
- 400: Invalid status value
- 401: Unauthorized
- 403: Forbidden
- 500: Server error

Business Rules:
- API-created offers should always be "Active"
- Manually-created offers can be "Active" or "Inactive"
```

#### 7. Update Offer Visibility

```
PATCH /api/admin/offers/:id/visibility

Request Body:
{
  "visibility": "Public" | "Internal" | "Hidden"
}

Response: Updated offer object

Error Responses:
- 404: Offer not found
- 400: Invalid visibility value
- 401: Unauthorized
- 403: Forbidden
- 500: Server error

Performance:
- This is called frequently from UI dropdown
- Consider optimistic updates on frontend
- Use debouncing if user changes rapidly
```

#### 8. Bulk Update Offers

```
POST /api/admin/offers/bulk-update

Request Body (multipart/form-data for file uploads, JSON otherwise):
{
  "offerIds": ["1952", "1953", "1954"],  // Array of offer IDs to update
  "updates": {
    "visibility": "Public" | "Internal" | "Hidden",
    "brandGuidelines": {
      "type": "url" | "file" | "text",
      "url": "https://example.com/guidelines", // If type is "url"
      "file": File,                             // If type is "file" - use FormData
      "text": "<p>Rich text content</p>",      // If type is "text"
      "notes": "Additional notes"
    }
  }
}

Response:
{
  "success": true,
  "updated": 3,                              // Number of offers successfully updated
  "failed": 0,                               // Number of offers that failed
  "results": {
    "successful": ["1952", "1953", "1954"],  // Array of offer IDs that were updated
    "failed": [                               // Array of offers that failed
      {
        "offerId": "1955",
        "error": "Offer not found",
        "reason": "The offer with ID 1955 does not exist"
      }
    ]
  },
  "message": "Successfully updated 3 offer(s)"
}

Error Responses:
- 400: Validation errors (empty offerIds, invalid values)
- 401: Unauthorized
- 403: Forbidden
- 404: One or more offers not found
- 413: File too large
- 500: Server error

Business Rules:
- All selected offers must exist
- If any offer fails, return partial success with details
- Brand guidelines file: Decide if same file applies to all or separate files
- Brand guidelines URL: Can be same for all offers
- Brand guidelines text: Can be same for all offers
- Brand guidelines notes: Can be same for all offers
- Log all bulk update actions in audit trail
- Track which user performed the bulk update

Performance Considerations:
- For large batches (100+ offers), consider:
  - Processing in chunks
  - Background job processing
  - Progress updates via WebSocket/SSE
  - Show progress bar to user
```

#### 9. Pull Offers Via API

```
POST /api/admin/offers/pull-from-api

Request Body (optional):
{
  "source": "external-api-1",              // API source identifier if multiple sources
  "force": false,                           // Force full sync vs incremental
  "filters": {                              // Optional filters for what to pull
    "advertiserIds": ["adv123", "adv456"],
    "dateRange": {
      "from": "2024-01-01T00:00:00Z",
      "to": "2024-01-31T23:59:59Z"
    },
    "status": "Active" | "Inactive"
  }
}

Response:
{
  "success": true,
  "synced": 50,                             // Number of offers synced
  "created": 10,                            // Number of new offers created
  "updated": 40,                            // Number of existing offers updated
  "skipped": 5,                             // Number of offers skipped (no changes)
  "errors": [                               // Any errors encountered
    {
      "offerId": "ext-123",
      "error": "Validation failed",
      "reason": "Missing required field: offerName"
    }
  ],
  "duration": 5234                          // Sync duration in milliseconds
}

Error Responses:
- 400: Invalid request parameters
- 401: Unauthorized (API credentials invalid)
- 403: Forbidden (no permission to sync)
- 408: Request timeout (sync taking too long)
- 500: Server error or external API error
- 503: External API unavailable

Background Processing:
- Consider making this an async job if sync takes long (>30 seconds)
- Provide job status endpoint: GET /api/admin/offers/sync-status/:jobId
- Allow user to check progress and cancel if needed
- Show job status in UI (progress bar, estimated time remaining)

Configuration:
- Store API credentials securely (encrypted)
- Allow admin to configure sync schedule (auto-sync)
- Log all sync operations for audit
- Store sync history (last sync time, results, errors)

Conflict Resolution:
- Define strategy for handling conflicts
- Options: API wins, Manual wins, or prompt user
- Log all conflicts for review
```

### Advertisers Management Endpoints

#### 1. Get All Advertisers

```
GET /api/admin/advertisers

Query Parameters: Same as Get All Offers

Response: Same structure as Get All Offers
```

#### 2. Get Advertiser by ID

```
GET /api/admin/advertisers/:id

Response: Same structure as Get Offer by ID
```

#### 3. Create Advertiser

```
POST /api/admin/advertisers

Request Body: Similar to Create Offer
```

#### 4. Update Advertiser

```
PUT /api/admin/advertisers/:id

Request Body: Similar to Update Offer
```

#### 5. Delete Advertiser

```
DELETE /api/admin/advertisers/:id

Response: Same structure as Delete Offer
```

#### 6. Update Advertiser Status

```
PATCH /api/admin/advertisers/:id/status

Request Body: Same as Update Offer Status
```

#### 7. Pull Advertisers Via API

```
POST /api/admin/advertisers/pull-from-api

Request Body: Same structure as Pull Offers Via API

Response: Same structure as Pull Offers Via API
```

### Publishers Management Endpoints

#### 1. Get All Publishers

```
GET /api/admin/publishers

Query Parameters: Same as Get All Offers

Response: Same structure as Get All Offers
```

#### 2. Get Publisher by ID

```
GET /api/admin/publishers/:id

Response: Same structure as Get Offer by ID
```

#### 3. Create Publisher

```
POST /api/admin/publishers

Request Body: Similar to Create Offer
```

#### 4. Update Publisher

```
PUT /api/admin/publishers/:id

Request Body: Similar to Update Offer
```

#### 5. Delete Publisher

```
DELETE /api/admin/publishers/:id

Response: Same structure as Delete Offer
```

#### 6. Update Publisher Status

```
PATCH /api/admin/publishers/:id/status

Request Body: Same as Update Offer Status
```

### Brand Guidelines Management Endpoints

#### 1. Get Brand Guidelines

```
GET /api/admin/{entityType}s/:id/brand-guidelines

Path Parameters:
- entityType: "offers" | "advertisers" | "publishers"
- id: string (entity ID)

Response:
{
  "success": true,
  "data": {
    "type": "url" | "file" | "text",
    "url": "https://example.com/guidelines",     // If type is "url"
    "fileUrl": "https://storage.example.com/file.pdf", // If type is "file"
    "fileName": "guidelines.pdf",                 // If type is "file"
    "fileSize": 1024000,                          // If type is "file" (bytes)
    "mimeType": "application/pdf",                // If type is "file"
    "text": "<p>Rich text content</p>",           // If type is "text"
    "notes": "Additional notes about brand guidelines",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-20T14:45:00Z"
  }
}

Error Responses:
- 404: Brand guidelines not found (return null, show "no guidelines" state)
- 401: Unauthorized
- 403: Forbidden
- 500: Server error
```

#### 2. Create/Update Brand Guidelines

```
PUT /api/admin/{entityType}s/:id/brand-guidelines

Path Parameters:
- entityType: "offers" | "advertisers" | "publishers"
- id: string (entity ID)

Request Body (JSON for URL/text, FormData for file):

For URL type:
{
  "type": "url",
  "url": "https://example.com/guidelines",  // Required, must be valid HTTPS URL
  "notes": "Additional notes"               // Optional
}

For Text type:
{
  "type": "text",
  "text": "<p>Rich text content</p>",       // Required, HTML or plain text
  "notes": "Additional notes"               // Optional
}

For File type (multipart/form-data):
- type: "file"
- file: File (multipart file upload)
- notes: string (optional)

File Upload Requirements:
- Validate file size (max 10MB)
- Validate file type (only .doc, .docx, .pdf)
- Store file in secure storage (S3, Azure Blob, etc.)
- If replacing existing file, delete old file from storage
- Return file URL or file ID for reference

Response:
{
  "success": true,
  "data": {
    "type": "url" | "file" | "text",
    "url": "https://example.com/guidelines",
    "fileUrl": "https://storage.example.com/file.pdf",
    "fileName": "guidelines.pdf",
    "fileSize": 1024000,
    "mimeType": "application/pdf",
    "text": "<p>Rich text content</p>",
    "notes": "Additional notes",
    "updatedAt": "2024-01-20T14:45:00Z"
  }
}

Error Responses:
- 400: Validation errors (invalid URL format, invalid file type/size, missing required fields)
- 401: Unauthorized
- 403: Forbidden
- 404: Entity not found
- 413: File too large
- 500: Server error or file storage error

Audit Trail:
- Log all brand guidelines updates
- Track which type was changed (url/file/text)
- Store previous values for rollback if needed
- Track who updated and when
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

**TODO: BACKEND - Implement Comprehensive Notification System**

#### Database Schema

```sql
CREATE TABLE notifications (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  type ENUM('request_approved', 'request_rejected', 'response_approved', 'response_rejected', 'offer_updated', 'bulk_update_complete', 'sync_complete', 'error') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  entity_type ENUM('request', 'offer', 'advertiser', 'publisher', 'bulk_operation') NOT NULL,
  entity_id VARCHAR(255),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_user_unread (user_id, read, created_at DESC),
  INDEX idx_user_created (user_id, created_at DESC),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### API Endpoints

**GET /api/notifications**

- Get user's notifications with pagination
- Query params: `page`, `limit`, `read`, `type`
- Response: `{ data: Notification[], pagination: {...} }`

**GET /api/notifications/unread-count**

- Get count of unread notifications
- Response: `{ count: number }`

**PATCH /api/notifications/:id/read**

- Mark notification as read
- Response: `{ success: boolean, notification: Notification }`

**PATCH /api/notifications/read-all**

- Mark all user notifications as read
- Response: `{ success: boolean, updated: number }`

**DELETE /api/notifications/:id**

- Delete a notification
- Response: `{ success: boolean }`

#### Real-time Notifications (WebSocket/SSE)

**WebSocket Endpoint: `/ws/notifications`**

- Connect with JWT token
- Send notifications in real-time when events occur
- Message format:
  ```json
  {
    "type": "notification",
    "data": {
      "id": "notif-123",
      "type": "request_approved",
      "title": "Request Approved",
      "message": "Your request has been approved",
      "entity_type": "request",
      "entity_id": "req-456",
      "created_at": "2024-12-20T10:30:00Z"
    }
  }
  ```

#### Notification Triggers

Implement notification system for:

- **Request approved by admin** → Notify advertiser
- **Request rejected by admin** → Notify publisher
- **Response approved by advertiser** → Notify admin & publisher
- **Response rejected by advertiser** → Notify admin
- **Offer updated** → Notify relevant users
- **Bulk update complete** → Notify initiator with statistics
- **API sync complete** → Notify initiator with sync results
- **Error occurred** → Notify admin (for critical errors)

#### Email Notifications (Optional)

**TODO: BACKEND - Implement Email Notification Service**

- Configure SMTP settings
- Send email for critical notifications
- Support HTML email templates
- Queue system for bulk emails
- Email preferences per user

### Error Tracking & Monitoring

**TODO: BACKEND - Implement Error Tracking Service**

#### Error Logging

```sql
CREATE TABLE error_logs (
  id VARCHAR(255) PRIMARY KEY,
  error_code VARCHAR(50) NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  user_id VARCHAR(255),
  request_id VARCHAR(255),
  endpoint VARCHAR(255),
  method VARCHAR(10),
  status_code INT,
  request_body JSON,
  response_body JSON,
  severity ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMP NULL,
  resolved_by VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_severity_created (severity, created_at DESC),
  INDEX idx_user_created (user_id, created_at DESC),
  INDEX idx_resolved (resolved, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### API Endpoints

**POST /api/admin/errors/log**

- Log application errors
- Used by frontend error boundaries
- Request body: `{ error: Error, context: {...} }`

**GET /api/admin/errors**

- Get error logs with filtering
- Query params: `severity`, `resolved`, `page`, `limit`
- Response: `{ data: ErrorLog[], pagination: {...} }`

**PATCH /api/admin/errors/:id/resolve**

- Mark error as resolved
- Response: `{ success: boolean }`

#### Integration with Monitoring Services

- **Sentry Integration**: Forward critical errors to Sentry
- **Datadog Integration**: Send metrics and logs
- **Health Check Endpoint**: `GET /api/health` for monitoring
- **Metrics Endpoint**: `GET /api/metrics` for Prometheus

### Real-time Updates

**TODO: BACKEND - Implement Real-time Update System**

#### WebSocket Support

**WebSocket Endpoint: `/ws/updates`**

- Connect with JWT token
- Subscribe to entity updates (offers, requests, advertisers, etc.)
- Broadcast updates when entities change
- Message format:
  ```json
  {
    "type": "entity_update",
    "entity_type": "offer",
    "entity_id": "offer-123",
    "action": "updated",
    "data": {
      /* updated entity data */
    },
    "timestamp": "2024-12-20T10:30:00Z"
  }
  ```

#### Server-Sent Events (SSE) Alternative

**SSE Endpoint: `/api/updates/stream`**

- Alternative to WebSocket for simpler use cases
- Stream updates as they occur
- Automatic reconnection handling

#### Use Cases

- Real-time offer updates
- Real-time request/response status changes
- Dashboard statistics updates
- Bulk operation progress
- API sync progress

### Future Enhancements

- [ ] File attachments for requests/responses
- [ ] Bulk operations (approve/reject multiple)
- [ ] Advanced analytics dashboard
- [ ] Export functionality (CSV, PDF)
- [ ] Slack/Teams integrations
- [ ] Automated workflow rules
- [ ] SLA tracking and alerts
- [ ] Advanced search with full-text indexing
- [ ] Audit log export functionality

---

## Contact Information

For backend implementation questions, contact:

- Backend Team Lead: [email]
- DevOps Team: [email]
- Database Team: [email]

---

**Last Updated:** December 2024
**Version:** 1.0.0
