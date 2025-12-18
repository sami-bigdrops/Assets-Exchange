# Stats Cards and Performance Charts - Backend Implementation Guide

This document provides detailed implementation guidance for the dashboard statistics cards and performance charts.

---

## Overview

The admin dashboard displays:

- **5 Statistics Cards**: Total Assets, New Requests, Approved Assets, Rejected Assets, Pending Approval
- **1 Performance Chart**: Time-series comparison chart with multiple metrics and comparison types

---

## API Endpoints Required

### 1. Dashboard Statistics

```
GET /api/admin/dashboard/stats
```

**Purpose:** Fetch all 5 statistics with trends and historical data

**Authentication:** Required (Admin role)

**Response Format:**

```json
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
```

### 2. Performance Chart Data

```
GET /api/admin/dashboard/performance?comparisonType={type}
```

**Purpose:** Fetch time-series data for performance comparison chart

**Authentication:** Required (Admin role)

**Query Parameters:**

- `comparisonType` (required):
  - `"Today vs Yesterday"`
  - `"Today vs Last Week"`
  - `"Current Week vs Last Week"`
  - `"Current Month vs Last Month"`

**Response Format:**

```json
{
  "success": true,
  "data": {
    "comparisonType": "Today vs Yesterday",
    "xAxisLabel": "Time",
    "data": [
      { "label": "00:00", "current": 1250, "previous": 980 },
      { "label": "01:00", "current": 890, "previous": 1100 },
      { "label": "02:00", "current": 1100, "previous": 950 }
      // ... more data points
    ]
  },
  "timestamp": "2024-12-20T10:30:00Z"
}
```

---

## Statistics Calculation Details

### 1. Total Assets

**Definition:** Total count of all publisher requests and advertiser responses

**SQL Query:**

```sql
SELECT COUNT(*) as total_assets
FROM (
  SELECT id FROM publisher_requests
  UNION ALL
  SELECT id FROM advertiser_responses
) AS all_assets;
```

**Breakdown Queries:**

Today's count:

```sql
SELECT COUNT(*) FROM (
  SELECT id FROM publisher_requests WHERE DATE(created_at) = CURDATE()
  UNION ALL
  SELECT id FROM advertiser_responses WHERE DATE(created_at) = CURDATE()
) AS today_assets;
```

Yesterday's count:

```sql
SELECT COUNT(*) FROM (
  SELECT id FROM publisher_requests WHERE DATE(created_at) = CURDATE() - INTERVAL 1 DAY
  UNION ALL
  SELECT id FROM advertiser_responses WHERE DATE(created_at) = CURDATE() - INTERVAL 1 DAY
) AS yesterday_assets;
```

Current Month:

```sql
SELECT COUNT(*) FROM (
  SELECT id FROM publisher_requests
  WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())
  UNION ALL
  SELECT id FROM advertiser_responses
  WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())
) AS current_month_assets;
```

Last Month:

```sql
SELECT COUNT(*) FROM (
  SELECT id FROM publisher_requests
  WHERE MONTH(created_at) = MONTH(CURDATE() - INTERVAL 1 MONTH)
    AND YEAR(created_at) = YEAR(CURDATE() - INTERVAL 1 MONTH)
  UNION ALL
  SELECT id FROM advertiser_responses
  WHERE MONTH(created_at) = MONTH(CURDATE() - INTERVAL 1 MONTH)
    AND YEAR(created_at) = YEAR(CURDATE() - INTERVAL 1 MONTH)
) AS last_month_assets;
```

---

### 2. New Requests

**Definition:** Count of publisher requests with status='new' and approval_stage='admin'

**SQL Query:**

```sql
SELECT COUNT(*) as new_requests
FROM publisher_requests
WHERE status = 'new' AND approval_stage = 'admin';
```

**Breakdown Queries:**

Today's count:

```sql
SELECT COUNT(*) FROM publisher_requests
WHERE status = 'new'
  AND approval_stage = 'admin'
  AND DATE(created_at) = CURDATE();
```

Yesterday's count:

```sql
SELECT COUNT(*) FROM publisher_requests
WHERE status = 'new'
  AND approval_stage = 'admin'
  AND DATE(created_at) = CURDATE() - INTERVAL 1 DAY;
```

Current Month / Last Month: Same pattern as above

---

### 3. Approved Assets

**Definition:** Count of requests that have been fully approved (status='approved', approval_stage='completed')

**SQL Query:**

```sql
SELECT COUNT(*) as approved_assets
FROM publisher_requests
WHERE status = 'approved' AND approval_stage = 'completed';
```

**Breakdown Queries:**

Today's count:

```sql
SELECT COUNT(*) FROM publisher_requests
WHERE status = 'approved'
  AND approval_stage = 'completed'
  AND DATE(updated_at) = CURDATE();  -- Use updated_at for approval date
```

Note: Use `updated_at` for approval date, not `created_at`

---

### 4. Rejected Assets

**Definition:** Count of all rejected requests from both publisher_requests and advertiser_responses

**SQL Query:**

```sql
SELECT COUNT(*) as rejected_assets
FROM (
  SELECT id FROM publisher_requests WHERE status = 'rejected'
  UNION ALL
  SELECT id FROM advertiser_responses WHERE status = 'rejected'
) AS all_rejected;
```

**Breakdown Queries:**

Today's count:

```sql
SELECT COUNT(*) FROM (
  SELECT id FROM publisher_requests
  WHERE status = 'rejected' AND DATE(updated_at) = CURDATE()
  UNION ALL
  SELECT id FROM advertiser_responses
  WHERE status = 'rejected' AND DATE(updated_at) = CURDATE()
) AS today_rejected;
```

---

### 5. Pending Approval

**Definition:** Count of requests awaiting approval (status IN ('new', 'pending'))

**SQL Query:**

```sql
SELECT COUNT(*) as pending_approval
FROM (
  SELECT id FROM publisher_requests WHERE status IN ('new', 'pending')
  UNION ALL
  SELECT id FROM advertiser_responses WHERE status = 'pending'
) AS all_pending;
```

**Breakdown Queries:**

Current count (snapshot):

```sql
SELECT COUNT(*) FROM (
  SELECT id FROM publisher_requests WHERE status IN ('new', 'pending')
  UNION ALL
  SELECT id FROM advertiser_responses WHERE status = 'pending'
) AS current_pending;
```

Yesterday's snapshot (for trend):

```sql
-- This requires the dashboard_stats_cache table
SELECT pending_approval FROM dashboard_stats_cache
WHERE stat_date = CURDATE() - INTERVAL 1 DAY
ORDER BY stat_hour DESC
LIMIT 1;
```

---

## Trend Calculation

**Formula:**

```
percentage_change = ((today_count - yesterday_count) / yesterday_count) * 100
```

**Icon Logic:**

```javascript
if (percentage_change >= 0) {
  trendIconValue = "trending-up";
} else {
  trendIconValue = "trending-down";
  percentage_change = Math.abs(percentage_change); // Display as positive
}
```

**Formatting:**

```javascript
textValue = Math.round(percentage_change) + "%"; // e.g., "43%"
```

**Edge Cases:**

- If `yesterday_count === 0`, display "N/A" or "100%" with trending-up
- If both are 0, display "0%"

---

## Performance Chart Data Aggregation

### Chart Type 1: Hourly Comparison (24 data points)

**Used for:**

- "Today vs Yesterday"
- "Today vs Last Week"

**X-Axis Labels:** "00:00", "01:00", "02:00", ..., "23:00"

**SQL Query:**

```sql
-- Get hourly counts for today and comparison day
SELECT
  HOUR(created_at) as hour,
  DATE(created_at) as date,
  COUNT(*) as count
FROM publisher_requests
WHERE DATE(created_at) IN (
  CURDATE(),  -- Today
  CURDATE() - INTERVAL 1 DAY  -- Or - INTERVAL 7 DAY for last week
)
GROUP BY DATE(created_at), HOUR(created_at)
ORDER BY date, hour;
```

**Data Processing:**

1. Create array of 24 hours (0-23)
2. For each hour, find matching count from query results
3. If no data for a specific hour, use 0
4. Map to format: `{ label: "HH:00", current: X, previous: Y }`

**Example Processing Logic:**

```javascript
function processHourlyData(queryResults) {
  const hourlyData = {};

  // Parse query results
  queryResults.forEach((row) => {
    const key = row.date.toISOString().split("T")[0];
    if (!hourlyData[key]) hourlyData[key] = {};
    hourlyData[key][row.hour] = row.count;
  });

  // Generate 24 data points
  const data = [];
  for (let hour = 0; hour < 24; hour++) {
    data.push({
      label: hour.toString().padStart(2, "0") + ":00",
      current: hourlyData[today]?.[hour] || 0,
      previous: hourlyData[comparisonDay]?.[hour] || 0,
    });
  }

  return {
    comparisonType: "Today vs Yesterday",
    xAxisLabel: "Time",
    data,
  };
}
```

---

### Chart Type 2: Daily Comparison (7 data points)

**Used for:**

- "Current Week vs Last Week"

**X-Axis Labels:** "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"

**SQL Query:**

```sql
SELECT
  DAYOFWEEK(created_at) as day_of_week,  -- 1=Sunday, 7=Saturday
  WEEK(created_at, 1) as week_number,
  COUNT(*) as count
FROM publisher_requests
WHERE created_at >= CURDATE() - INTERVAL 14 DAY
GROUP BY WEEK(created_at, 1), DAYOFWEEK(created_at)
ORDER BY week_number, day_of_week;
```

**Data Processing:**

```javascript
function processWeeklyData(queryResults) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyData = {};

  queryResults.forEach((row) => {
    if (!weeklyData[row.week_number]) weeklyData[row.week_number] = {};
    weeklyData[row.week_number][row.day_of_week] = row.count;
  });

  const currentWeek = getCurrentWeekNumber();
  const lastWeek = currentWeek - 1;

  const data = days.map((day, index) => ({
    label: day,
    current: weeklyData[currentWeek]?.[index + 1] || 0,
    previous: weeklyData[lastWeek]?.[index + 1] || 0,
  }));

  return {
    comparisonType: "Current Week vs Last Week",
    xAxisLabel: "Day",
    data,
  };
}
```

---

### Chart Type 3: Monthly Comparison (31 data points)

**Used for:**

- "Current Month vs Last Month"

**X-Axis Labels:** "01", "02", "03", ..., "31"

**SQL Query:**

```sql
SELECT
  DAY(created_at) as day_of_month,
  MONTH(created_at) as month,
  YEAR(created_at) as year,
  COUNT(*) as count
FROM publisher_requests
WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 2 MONTH)
GROUP BY YEAR(created_at), MONTH(created_at), DAY(created_at)
ORDER BY year, month, day_of_month;
```

**Data Processing:**

```javascript
function processMonthlyData(queryResults) {
  const monthlyData = {};

  queryResults.forEach((row) => {
    const key = `${row.year}-${row.month}`;
    if (!monthlyData[key]) monthlyData[key] = {};
    monthlyData[key][row.day_of_month] = row.count;
  });

  const currentMonth = getCurrentMonthKey();
  const lastMonth = getLastMonthKey();
  const daysInMonth = getDaysInMonth(currentMonth);

  const data = [];
  for (let day = 1; day <= daysInMonth; day++) {
    data.push({
      label: day.toString().padStart(2, "0"),
      current: monthlyData[currentMonth]?.[day] || 0,
      previous: monthlyData[lastMonth]?.[day] || 0,
    });
  }

  return {
    comparisonType: "Current Month vs Last Month",
    xAxisLabel: "Date",
    data,
  };
}
```

---

## Performance Optimization

### 1. Pre-Aggregated Cache Table

**Create Table:**

```sql
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
) ENGINE=InnoDB;
```

**Benefits:**

- Fast queries for historical data
- No need to count millions of rows repeatedly
- Can serve chart data directly from cache

**Update Strategy:**

- Run hourly cron job to populate cache
- Update current hour's data every 5-10 minutes
- Backfill historical data on first deployment

---

### 2. Redis Caching

**Stats Endpoint:**

- Cache Key: `admin:dashboard:stats`
- TTL: 2 minutes (120 seconds)
- Invalidate on: Any request status change

**Performance Chart Endpoint:**

- Cache Key: `admin:dashboard:performance:{comparisonType}`
- TTL: 5 minutes for hourly (300 seconds)
- TTL: 15 minutes for weekly/monthly (900 seconds)
- Invalidate on: New requests, status changes

**Implementation Example:**

```javascript
async function getStatistics() {
  const cacheKey = "admin:dashboard:stats";

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Calculate from database
  const stats = await calculateStatisticsFromDB();

  // Store in cache
  await redis.set(cacheKey, JSON.stringify(stats), "EX", 120);

  return stats;
}
```

---

### 3. Database Indexes

**Critical Indexes:**

```sql
-- For stats calculations
CREATE INDEX idx_status_stage_created ON publisher_requests(status, approval_stage, created_at);
CREATE INDEX idx_status_stage_updated ON publisher_requests(status, approval_stage, updated_at);

-- For hourly aggregations
CREATE INDEX idx_created_date_hour ON publisher_requests(DATE(created_at), HOUR(created_at));
CREATE INDEX idx_created_date ON publisher_requests(DATE(created_at));

-- For weekly aggregations
CREATE INDEX idx_week_dayofweek ON publisher_requests(WEEK(created_at, 1), DAYOFWEEK(created_at));

-- For monthly aggregations
CREATE INDEX idx_year_month_day ON publisher_requests(YEAR(created_at), MONTH(created_at), DAY(created_at));
```

---

## Error Handling

**Common Errors:**

1. **No data available**
   - Return empty arrays with zeros
   - Frontend will display "No data available"

2. **Division by zero in trend calculation**
   - If yesterday_count is 0, return "N/A" or handle specially

3. **Future dates in comparison**
   - Ensure date ranges are valid
   - Current period must be >= comparison period

**Error Response Format:**

```json
{
  "success": false,
  "error": {
    "code": "STATS_001",
    "message": "Failed to calculate statistics",
    "details": "Division by zero in trend calculation"
  },
  "timestamp": "2024-12-20T10:30:00Z"
}
```

---

## Testing Guidelines

### Unit Tests

Test each statistic calculation:

```javascript
describe("Dashboard Statistics", () => {
  test("Total Assets calculation", async () => {
    const stats = await calculateTotalAssets();
    expect(stats.value).toBeGreaterThanOrEqual(0);
    expect(stats.trend).toBeDefined();
  });

  test("Trend calculation with zero yesterday", async () => {
    const trend = calculateTrend(10, 0);
    expect(trend.textValue).toBe("N/A");
  });
});
```

### Integration Tests

Test API endpoints:

```javascript
describe("GET /api/admin/dashboard/stats", () => {
  test("returns all 5 statistics", async () => {
    const response = await request(app)
      .get("/api/admin/dashboard/stats")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.stats).toHaveLength(5);
  });
});
```

### Performance Tests

Load test dashboard endpoints:

```javascript
// k6 load test
export const options = {
  vus: 50,
  duration: "30s",
};

export default function () {
  http.get("http://localhost:3000/api/admin/dashboard/stats");
}
```

Target: < 500ms response time under 50 concurrent users

---

## Deployment Checklist

- [ ] Create dashboard_stats_cache table
- [ ] Set up hourly cron job for stats aggregation
- [ ] Create all necessary database indexes
- [ ] Configure Redis cache
- [ ] Deploy stats endpoint
- [ ] Deploy performance chart endpoint
- [ ] Test with real data
- [ ] Verify cache invalidation works
- [ ] Load test both endpoints
- [ ] Set up monitoring alerts
- [ ] Document API in Swagger/OpenAPI

---

## Monitoring

**Key Metrics to Track:**

1. **Response Times**
   - Stats endpoint: Target < 200ms
   - Chart endpoint: Target < 500ms

2. **Cache Hit Rates**
   - Stats cache: Target > 80%
   - Chart cache: Target > 70%

3. **Database Query Performance**
   - Aggregation queries: Target < 1s
   - Index usage: Should use indexes for all queries

4. **Error Rates**
   - Target < 0.1% error rate

**Alerts:**

- Response time > 1s
- Error rate > 1%
- Cache hit rate < 50%
- Database query time > 5s

---

## Additional Notes

### Frontend Considerations

The frontend expects:

- Icon strings ("trending-up", "trending-down") which are mapped to Lucide React icons
- Formatted values (e.g., "25k" for 25000)
- Percentage strings with % symbol
- Consistent data point counts in charts

### Value Formatting

Backend should format large numbers:

- < 1,000: Show as-is (e.g., "400")
- < 1,000,000: Show in thousands (e.g., "25k")
- > = 1,000,000: Show in millions (e.g., "1.2M")

Example:

```javascript
function formatValue(value) {
  if (value < 1000) return value.toString();
  if (value < 1000000) return (value / 1000).toFixed(1) + "k";
  return (value / 1000000).toFixed(1) + "M";
}
```

---

**For more details, see:**

- [Backend_Implementation_TODOs.md](./Backend_Implementation_TODOs.md) - Complete backend guide
- [BACKEND_TODOS_SUMMARY.md](./BACKEND_TODOS_SUMMARY.md) - Quick reference

**Contact:** Backend Team Lead
