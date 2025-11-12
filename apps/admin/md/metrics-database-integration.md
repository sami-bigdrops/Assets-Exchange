# Metrics Database Integration

## Overview
Implemented database-driven metrics system with per-tenant data isolation and automatic percentage calculation logic.

## Changes Made

### 1. Database Schema (`packages/db/src/schema.ts`)
- Added `metrics` table with the following structure:
  - `id`: UUID primary key
  - `tenantId`: Foreign key to tenants table (cascade delete)
  - `metricType`: Text field for metric type (totalAssets, newRequests, approvedAssets, rejectedAssets, pendingApproval)
  - `todayValue`: Integer for today's metric value
  - `yesterdayValue`: Integer for yesterday's metric value
  - `currentMonthValue`: Integer for current month's total
  - `lastMonthValue`: Integer for last month's total
  - `date`: Timestamp for tracking when the snapshot was taken
  - `createdAt` and `updatedAt`: Timestamps for audit trail

### 2. Metrics Library (`apps/admin/lib/metrics.ts`)
- Created `getMetricsByTenantSlug()` function to fetch metrics for a specific tenant
- Implemented `calculatePercentage()` function that:
  - Calculates percentage change between today and yesterday
  - Determines trend (up/down) based on positive or negative change
  - Handles edge cases (division by zero, zero values)
- Added `formatMetricValue()` function to format large numbers (e.g., 1000 → "1.0k", 1000000 → "1.0M")
- Fetches metrics for the current day using date range filtering

### 3. API Route (`apps/admin/app/api/metrics/[tenant]/route.ts`)
- Created GET endpoint at `/api/metrics/[tenant]`
- Returns formatted metrics data with:
  - Current value
  - Today's percentage change and trend
  - Formatted yesterday, current month, and last month values
- Handles errors gracefully

### 4. Custom Hook (`apps/admin/hooks/use-metrics.ts`)
- Created `useMetrics()` hook for fetching metrics in client components
- Manages loading state
- Automatically fetches metrics when tenant changes

### 5. Dashboard Metrics Component (`apps/admin/components/dashboard/dashboard-metrics.tsx`)
- Updated to fetch real data from API instead of hardcoded values
- Added loading state with skeleton loaders
- Maps metric types to card configurations (title, icon, colors)
- Passes tenant prop to fetch tenant-specific data
- Maintains personalized color support

### 6. Dashboard Page (`apps/admin/app/[tenant]/page.tsx`)
- Updated to pass `tenant` prop to `DashboardMetrics` component

## Percentage Calculation Logic

The percentage calculation compares today's value with yesterday's value:

```typescript
function calculatePercentage(current: number, previous: number) {
  if (previous === 0) {
    return { percentage: current > 0 ? "100%" : "0%", trend: current > 0 ? "up" : "down" };
  }
  
  const change = ((current - previous) / previous) * 100;
  const trend = change >= 0 ? "up" : "down";
  const percentage = `${Math.abs(Math.round(change))}%`;
  
  return { percentage, trend };
}
```

**Features:**
- Handles division by zero (when yesterday is 0)
- Rounds to nearest integer
- Always shows absolute value of percentage
- Determines trend direction (up for positive/zero change, down for negative)

## Database Migration

Migration file generated: `packages/db/drizzle/0003_aromatic_vivisector.sql`

Applied to database successfully.

## Data Structure

Each tenant has separate metrics data stored in the `metrics` table. The system:
- Fetches metrics for the current day
- Returns default values (0) if no metrics exist for a tenant
- Calculates percentages automatically based on today vs yesterday comparison

## Usage

```typescript
// In a component
const { metrics, loading } = useMetrics(tenant);

// Metrics structure:
{
  metricType: "totalAssets",
  value: 1263,
  today: {
    trend: "up",
    percentage: "43%"
  },
  yesterday: "400",
  currentMonth: "25k",
  lastMonth: "10.8k"
}
```

## Next Steps

To populate metrics data, you'll need to:
1. Create an API endpoint or background job to update metrics daily
2. Insert/update records in the `metrics` table for each tenant
3. Ensure `todayValue`, `yesterdayValue`, `currentMonthValue`, and `lastMonthValue` are updated regularly

