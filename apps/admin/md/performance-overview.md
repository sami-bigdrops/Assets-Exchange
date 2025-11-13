# Performance Overview Component

## Overview
Implemented a Performance Overview section for the dashboard that displays performance metrics over time using area and line charts. The component includes dropdown filters for metric type and time period selection.

## Changes Made

### 1. Dependencies
- **recharts** (^3.4.1): Added charting library for React to render area and line charts
- **Select Component**: Added shadcn/ui Select component to packages/ui for dropdown functionality

### 2. Performance Overview Component (`apps/admin/components/dashboard/performance-overview.tsx`)
- Created new component that displays performance metrics in a visual chart format
- Features:
  - **Area Chart**: Displays `todayValue` with purple gradient fill
  - **Line Chart**: Displays `yesterdayValue` as a purple line with circular markers
  - **Metric Dropdown**: Allows selection between:
    - Total Assets
    - New Requests
    - Approved Assets
    - Rejected Assets
    - Pending Approval
  - **Time Period Dropdown**: Allows selection of comparison types:
    - **Today vs Yesterday**: 24-hour hourly comparison between today and yesterday
    - **Today vs Same Day Last Week**: 24-hour hourly comparison between today and the same day last week
    - **Current Week vs Last Week**: Daily comparison (Monday to Sunday) between current week and last week
    - **Current Month vs Last Month**: Daily comparison for all days in the current month vs last month
  - **Responsive Design**: Chart adapts to container width
  - **Interactive Tooltips**: Shows values on hover

### 3. Dashboard Page Integration (`apps/admin/app/[tenant]/page.tsx`)
- Added `PerformanceOverview` component below the `DashboardMetrics` component
- Component is displayed in the same space-y-6 layout

## Component Structure

```typescript
interface PerformanceData {
  label: string
  todayValue: number
  yesterdayValue: number
}
```

The component uses a `ComposedChart` from recharts to combine:
- `Area` component for todayValue (purple gradient fill)
- `Line` component for yesterdayValue (purple line with dots)

## Data Generation Functions

The component includes four specialized data generation functions:

### 1. `generateTodayVsYesterday()`
- Generates 24 data points (one per hour)
- X-axis labels: "00:00" to "23:00"
- Base value: 50 with hourly variations
- Compares today's hourly data with yesterday's hourly data

### 2. `generateTodayVsSameDayLastWeek()`
- Generates 24 data points (one per hour)
- X-axis labels: "00:00" to "23:00"
- Base value: 50 with hourly variations
- Compares today's hourly data with the same day last week
- Automatically calculates which day of the week to compare

### 3. `generateCurrentWeekVsLastWeek()`
- Generates 7 data points (Monday to Sunday)
- X-axis labels: "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"
- Base value: 200 with daily variations
- Calculates current week's Monday and compares each day with last week
- Handles week boundaries correctly

### 4. `generateCurrentMonthVsLastMonth()`
- Generates data points for all days in the current month
- X-axis labels: Day numbers (1, 2, 3, ..., 28/29/30/31)
- Base value: 300 with daily variations
- Automatically calculates number of days in current month
- X-axis labels are angled at -45 degrees for better readability

## Chart Configuration

- **Y-Axis**: Auto-calculated max value rounded to nearest 50
- **X-Axis**: 
  - For hourly views: Hour labels (00:00 - 23:00)
  - For weekly view: Day abbreviations (Mon - Sun)
  - For monthly view: Day numbers (1 - 31) angled at -45 degrees
- **Colors**: Purple theme (#8B5CF6) for both area and line
- **Grid**: Light gray dashed lines for better readability
- **Tooltip**: Custom styled tooltip showing values on hover

## Usage

```typescript
import { PerformanceOverview } from "@/components/dashboard/performance-overview"

// In your component
<PerformanceOverview />
```

## Next Steps

To integrate with real data:
1. Create API endpoint to fetch performance data by tenant and metric type
2. Replace `generateDummyData()` with API call
3. Pass tenant prop to component
4. Map selected metric to appropriate data source
5. Update data structure to match backend response format

## Comparison Types Implementation

### Today vs Yesterday
- **Data Points**: 24 hours (00:00 to 23:00)
- **Comparison**: Today's hourly revenue vs Yesterday's hourly revenue
- **Use Case**: Compare today's performance with yesterday's performance hour by hour

### Today vs Same Day Last Week
- **Data Points**: 24 hours (00:00 to 23:00)
- **Comparison**: Today's hourly revenue vs Same day last week's hourly revenue
- **Use Case**: Compare today's performance with the same weekday from last week (e.g., Monday vs Monday)
- **Dynamic Calculation**: Automatically determines which day of the week to compare

### Current Week vs Last Week
- **Data Points**: 7 days (Monday to Sunday)
- **Comparison**: Current week's daily revenue vs Last week's daily revenue
- **Use Case**: Week-over-week comparison
- **Week Calculation**: Correctly handles week boundaries (Monday is start of week)

### Current Month vs Last Month
- **Data Points**: All days in current month (28/29/30/31 days)
- **Comparison**: Current month's daily revenue vs Last month's daily revenue
- **Use Case**: Month-over-month comparison
- **Dynamic Days**: Automatically calculates number of days in current month
- **X-Axis**: Labels angled at -45 degrees for better readability with many data points

## Code Reference

```148:173:apps/admin/components/dashboard/performance-overview.tsx
export function PerformanceOverview() {
  const [selectedMetric, setSelectedMetric] = useState("Total Assets")
  const [selectedPeriod, setSelectedPeriod] = useState("Today vs Yesterday")

  const getChartData = (period: string): PerformanceData[] => {
    switch (period) {
      case "Today vs Yesterday":
        return generateTodayVsYesterday()
      case "Today vs Same Day Last Week":
        return generateTodayVsSameDayLastWeek()
      case "Current Week vs Last Week":
        return generateCurrentWeekVsLastWeek()
      case "Current Month vs Last Month":
        return generateCurrentMonthVsLastMonth()
      default:
        return generateTodayVsYesterday()
    }
  }

  const chartData = getChartData(selectedPeriod)

  const maxValue = Math.max(
    ...chartData.map((d) => Math.max(d.todayValue, d.yesterdayValue))
  )
  const yAxisMax = Math.ceil(maxValue / 50) * 50
```

