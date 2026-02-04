# Audit Logs Filter - Frontend State Logic Specification

**Date:** 2024  
**Component:** Audit Logs Filter State Management  
**Status:** 📋 **SPECIFICATION**

---

## Executive Summary

This document defines the frontend state management logic for the Audit Logs filter component. It specifies all state variables, their types, default values, and the logic required to track and manage filter state throughout the component lifecycle.

---

## 1. State Variables Overview

### 1.1 Required State Variables

The filter component must track the following state variables:

| Variable         | Type     | Purpose                             | Default Value       |
| ---------------- | -------- | ----------------------------------- | ------------------- |
| `selectedAction` | `string` | Currently selected action filter    | `"All"`             |
| `selectedAdmin`  | `string` | Currently selected admin filter     | `""` (empty string) |
| `fromDate`       | `string` | Starting date for date range filter | `""` (empty string) |
| `toDate`         | `string` | Ending date for date range filter   | `""` (empty string) |
| `currentPage`    | `number` | Current page number for pagination  | `1`                 |
| `pageSize`       | `number` | Number of items per page            | `20`                |

---

## 2. TypeScript Interface Definition

### 2.1 Filter State Interface

```typescript
interface FilterState {
  selectedAction: string;
  selectedAdmin: string;
  fromDate: string;
  toDate: string;
  currentPage: number;
  pageSize: number;
}
```

### 2.2 Default State Constant

```typescript
const DEFAULT_FILTER_STATE: FilterState = {
  selectedAction: "All",
  selectedAdmin: "",
  fromDate: "",
  toDate: "",
  currentPage: 1,
  pageSize: 20,
};
```

---

## 3. State Variable Specifications

### 3.1 selectedAction

**Type:** `string`  
**Default Value:** `"All"`  
**Valid Values:**

- `"All"` - No action filter applied (shows all actions)
- `"APPROVE"` - Filter to show only APPROVE actions
- `"REJECT"` - Filter to show only REJECT actions

**State Management:**

```typescript
const [selectedAction, setSelectedAction] = useState<string>("All");
```

**Behavior:**

- When `"All"` is selected, no action filter is applied to the API request
- When `"APPROVE"` or `"REJECT"` is selected, the filter is applied
- Changing this value should reset `currentPage` to `1`

**Reset Logic:**

```typescript
setSelectedAction("All");
```

---

### 3.2 selectedAdmin

**Type:** `string`  
**Default Value:** `""` (empty string)  
**Valid Values:**

- Empty string (`""`) - No admin filter applied
- Non-empty string - Admin ID to filter by (UUID or CUID format)

**State Management:**

```typescript
const [selectedAdmin, setSelectedAdmin] = useState<string>("");
```

**Behavior:**

- When empty, no admin filter is applied to the API request
- When non-empty, filters logs by the specified admin ID
- Should be trimmed before use (whitespace removed)
- Changing this value should reset `currentPage` to `1`

**Reset Logic:**

```typescript
setSelectedAdmin("");
```

**Validation:**

- Optional validation: Check if value matches UUID or CUID format
- Empty string is always valid (no filter)

---

### 3.3 fromDate

**Type:** `string`  
**Default Value:** `""` (empty string)  
**Valid Values:**

- Empty string (`""`) - No "From" date filter applied
- Date string in `YYYY-MM-DD` format - Start date for range filter

**State Management:**

```typescript
const [fromDate, setFromDate] = useState<string>("");
```

**Behavior:**

- When empty, no "From" date filter is applied
- When set, filters logs with `created_at >= fromDate`
- Format: ISO 8601 date string (`YYYY-MM-DD`)
- Should be validated before use
- Changing this value should reset `currentPage` to `1` if it affects results

**Reset Logic:**

```typescript
setFromDate("");
```

**Date Format:**

- Display format: `YYYY-MM-DD` (e.g., "2024-01-15")
- API format: `YYYY-MM-DD` (same as display)
- Internal storage: String representation of date

**Validation:**

- Must be a valid date string
- Must be in `YYYY-MM-DD` format
- Should not be in the future (optional validation)

---

### 3.4 toDate

**Type:** `string`  
**Default Value:** `""` (empty string)  
**Valid Values:**

- Empty string (`""`) - No "To" date filter applied
- Date string in `YYYY-MM-DD` format - End date for range filter

**State Management:**

```typescript
const [toDate, setToDate] = useState<string>("");
```

**Behavior:**

- When empty, no "To" date filter is applied
- When set, filters logs with `created_at <= toDate`
- Format: ISO 8601 date string (`YYYY-MM-DD`)
- Should be validated before use
- Must be >= `fromDate` if both are set
- Changing this value should reset `currentPage` to `1` if it affects results

**Reset Logic:**

```typescript
setToDate("");
```

**Date Format:**

- Display format: `YYYY-MM-DD` (e.g., "2024-01-15")
- API format: `YYYY-MM-DD` (same as display)
- Internal storage: String representation of date

**Validation:**

- Must be a valid date string
- Must be in `YYYY-MM-DD` format
- Must be >= `fromDate` if `fromDate` is set
- Should not be in the future (optional validation)

---

### 3.5 currentPage

**Type:** `number`  
**Default Value:** `1`  
**Valid Values:**

- Integer >= 1

**State Management:**

```typescript
const [currentPage, setCurrentPage] = useState<number>(1);
```

**Behavior:**

- Represents the current page number in pagination
- Minimum value: 1 (first page)
- Maximum value: Determined by API response (`meta.totalPages`)
- Should reset to `1` when any filter changes (except page navigation)
- Increments/decrements on Previous/Next button clicks

**Reset Logic:**

```typescript
setCurrentPage(1);
```

**Validation:**

- Must be >= 1
- Must be <= `totalPages` (from API response)
- Should be validated before API request

---

### 3.6 pageSize

**Type:** `number`  
**Default Value:** `20`  
**Valid Values:**

- Integer between 1 and 100 (inclusive)

**State Management:**

```typescript
const [pageSize, setPageSize] = useState<number>(20);
```

**Behavior:**

- Represents the number of items displayed per page
- Default: 20 items per page
- Maximum: 100 items per page (API limit)
- Minimum: 1 item per page
- Typically constant (not changed by user in current implementation)
- If changed, should reset `currentPage` to `1`

**Reset Logic:**

```typescript
setPageSize(20);
```

**Validation:**

- Must be >= 1
- Must be <= 100 (API maximum)
- Should be validated before API request

---

## 4. Complete State Management Implementation

### 4.1 React Component State Setup

```typescript
"use client";

import { useState, useCallback, useEffect } from "react";

// Type definitions
interface FilterState {
  selectedAction: string;
  selectedAdmin: string;
  fromDate: string;
  toDate: string;
  currentPage: number;
  pageSize: number;
}

// Default state constant
const DEFAULT_FILTER_STATE: FilterState = {
  selectedAction: "All",
  selectedAdmin: "",
  fromDate: "",
  toDate: "",
  currentPage: 1,
  pageSize: 20,
};

export function AuditLogsTable() {
  // Individual state variables
  const [selectedAction, setSelectedAction] = useState<string>(
    DEFAULT_FILTER_STATE.selectedAction
  );
  const [selectedAdmin, setSelectedAdmin] = useState<string>(
    DEFAULT_FILTER_STATE.selectedAdmin
  );
  const [fromDate, setFromDate] = useState<string>(
    DEFAULT_FILTER_STATE.fromDate
  );
  const [toDate, setToDate] = useState<string>(DEFAULT_FILTER_STATE.toDate);
  const [currentPage, setCurrentPage] = useState<number>(
    DEFAULT_FILTER_STATE.currentPage
  );
  const [pageSize, setPageSize] = useState<number>(
    DEFAULT_FILTER_STATE.pageSize
  );

  // Additional state for component functionality
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ... rest of component
}
```

### 4.2 Alternative: Single State Object (Optional)

For more centralized state management, you can use a single state object:

```typescript
const [filterState, setFilterState] =
  useState<FilterState>(DEFAULT_FILTER_STATE);

// Update individual properties
const updateFilterState = (updates: Partial<FilterState>) => {
  setFilterState((prev) => ({ ...prev, ...updates }));
};

// Usage
updateFilterState({ selectedAction: "APPROVE" });
updateFilterState({ currentPage: 2 });
```

**Recommendation:** Use individual state variables (as shown in 4.1) for better React DevTools debugging and simpler updates.

---

## 5. State Update Handlers

### 5.1 Action Filter Handler

```typescript
const handleActionChange = (action: string) => {
  setSelectedAction(action);
  setCurrentPage(1); // Reset to first page on filter change
};
```

### 5.2 Admin Filter Handler

```typescript
const handleAdminChange = (adminId: string) => {
  setSelectedAdmin(adminId.trim()); // Trim whitespace
  setCurrentPage(1); // Reset to first page on filter change
};
```

### 5.3 From Date Handler

```typescript
const handleFromDateChange = (date: Date | undefined) => {
  if (date) {
    // Format date as YYYY-MM-DD
    const formattedDate = format(date, "yyyy-MM-dd");
    setFromDate(formattedDate);
  } else {
    setFromDate(""); // Clear filter
  }
  setCurrentPage(1); // Reset to first page on filter change
};
```

### 5.4 To Date Handler

```typescript
const handleToDateChange = (date: Date | undefined) => {
  if (date) {
    // Format date as YYYY-MM-DD
    const formattedDate = format(date, "yyyy-MM-dd");
    setToDate(formattedDate);
  } else {
    setToDate(""); // Clear filter
  }
  setCurrentPage(1); // Reset to first page on filter change
};
```

### 5.5 Page Change Handler

```typescript
const handlePageChange = (newPage: number) => {
  // Validate page number
  if (newPage >= 1 && meta && newPage <= meta.totalPages) {
    setCurrentPage(newPage);
    // Fetch data with new page (maintains current filters)
  }
};
```

### 5.6 Clear Filters Handler

```typescript
const handleClearFilters = () => {
  // Reset all filters to default state
  setSelectedAction(DEFAULT_FILTER_STATE.selectedAction);
  setSelectedAdmin(DEFAULT_FILTER_STATE.selectedAdmin);
  setFromDate(DEFAULT_FILTER_STATE.fromDate);
  setToDate(DEFAULT_FILTER_STATE.toDate);
  setCurrentPage(DEFAULT_FILTER_STATE.currentPage);
  // pageSize typically doesn't reset

  // Fetch data with no filters
  fetchAuditLogs(DEFAULT_FILTER_STATE);
};
```

---

## 6. State Validation Logic

### 6.1 Filter State Validator

```typescript
interface FilterValidationResult {
  isValid: boolean;
  errors: string[];
}

const validateFilterState = (state: FilterState): FilterValidationResult => {
  const errors: string[] = [];

  // Validate selectedAction
  if (!["All", "APPROVE", "REJECT"].includes(state.selectedAction)) {
    errors.push("Invalid action filter value");
  }

  // Validate fromDate
  if (state.fromDate) {
    const fromDateObj = new Date(state.fromDate);
    if (isNaN(fromDateObj.getTime())) {
      errors.push("Invalid fromDate format");
    }
  }

  // Validate toDate
  if (state.toDate) {
    const toDateObj = new Date(state.toDate);
    if (isNaN(toDateObj.getTime())) {
      errors.push("Invalid toDate format");
    }
  }

  // Validate date range
  if (state.fromDate && state.toDate) {
    const fromDateObj = new Date(state.fromDate);
    const toDateObj = new Date(state.toDate);
    if (fromDateObj > toDateObj) {
      errors.push("fromDate must be less than or equal to toDate");
    }
  }

  // Validate currentPage
  if (state.currentPage < 1) {
    errors.push("currentPage must be at least 1");
  }

  // Validate pageSize
  if (state.pageSize < 1 || state.pageSize > 100) {
    errors.push("pageSize must be between 1 and 100");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
```

### 6.2 Usage in Component

```typescript
const handleSearch = () => {
  const filterState: FilterState = {
    selectedAction,
    selectedAdmin,
    fromDate,
    toDate,
    currentPage: 1, // Reset to page 1 on search
    pageSize,
  };

  const validation = validateFilterState(filterState);

  if (!validation.isValid) {
    // Display validation errors
    validation.errors.forEach((error) => {
      toast.error(error);
    });
    return;
  }

  // Proceed with API request
  fetchAuditLogs(filterState);
};
```

---

## 7. API Request Parameter Mapping

### 7.1 State to API Parameters

```typescript
const buildApiParams = (state: FilterState): URLSearchParams => {
  const params = new URLSearchParams();

  // Map selectedAction to actionType parameter
  if (state.selectedAction !== "All") {
    params.append("actionType", state.selectedAction);
  }

  // Map selectedAdmin to adminID parameter
  if (state.selectedAdmin.trim()) {
    params.append("adminID", state.selectedAdmin.trim());
  }

  // Map fromDate to dateFrom parameter
  if (state.fromDate) {
    params.append("dateFrom", state.fromDate);
  }

  // Map toDate to dateTo parameter
  if (state.toDate) {
    params.append("dateTo", state.toDate);
  }

  // Map currentPage to page parameter
  params.append("page", String(state.currentPage));

  // Map pageSize to limit parameter
  params.append("limit", String(state.pageSize));

  return params;
};
```

### 7.2 Usage in Fetch Function

```typescript
const fetchAuditLogs = useCallback(
  async (page: number = currentPage) => {
    setIsLoading(true);
    setError(null);

    try {
      const filterState: FilterState = {
        selectedAction,
        selectedAdmin,
        fromDate,
        toDate,
        currentPage: page,
        pageSize,
      };

      const params = buildApiParams(filterState);
      const response = await fetch(
        `/api/admin/audit-logs?${params.toString()}`
      );

      // ... handle response
    } catch (err) {
      // ... handle error
    } finally {
      setIsLoading(false);
    }
  },
  [selectedAction, selectedAdmin, fromDate, toDate, currentPage, pageSize]
);
```

---

## 8. State Reset Logic

### 8.1 Reset to Default State

```typescript
const resetToDefaultState = () => {
  setSelectedAction(DEFAULT_FILTER_STATE.selectedAction);
  setSelectedAdmin(DEFAULT_FILTER_STATE.selectedAdmin);
  setFromDate(DEFAULT_FILTER_STATE.fromDate);
  setToDate(DEFAULT_FILTER_STATE.toDate);
  setCurrentPage(DEFAULT_FILTER_STATE.currentPage);
  // pageSize typically doesn't reset
};
```

### 8.2 Reset Specific Filters

```typescript
const resetActionFilter = () => {
  setSelectedAction("All");
  setCurrentPage(1);
};

const resetAdminFilter = () => {
  setSelectedAdmin("");
  setCurrentPage(1);
};

const resetDateFilters = () => {
  setFromDate("");
  setToDate("");
  setCurrentPage(1);
};
```

---

## 9. State Persistence (Optional - URL Sync)

### 9.1 URL Query Parameter Sync

If implementing URL query parameter sync, state should be initialized from URL:

```typescript
import { useSearchParams } from "next/navigation";

export function AuditLogsTable() {
  const searchParams = useSearchParams();

  // Initialize state from URL parameters
  const [selectedAction, setSelectedAction] = useState<string>(() => {
    return searchParams.get("actionType") || "All";
  });

  const [selectedAdmin, setSelectedAdmin] = useState<string>(() => {
    return searchParams.get("adminID") || "";
  });

  const [fromDate, setFromDate] = useState<string>(() => {
    return searchParams.get("dateFrom") || "";
  });

  const [toDate, setToDate] = useState<string>(() => {
    return searchParams.get("dateTo") || "";
  });

  const [currentPage, setCurrentPage] = useState<number>(() => {
    const pageParam = searchParams.get("page");
    return pageParam ? parseInt(pageParam, 10) : 1;
  });

  const [pageSize] = useState<number>(20); // Typically not in URL
}
```

---

## 10. Complete State Management Summary

### 10.1 Default State Values

```typescript
const DEFAULT_FILTER_STATE = {
  selectedAction: "All", // No action filter
  selectedAdmin: "", // No admin filter
  fromDate: "", // No from date filter
  toDate: "", // No to date filter
  currentPage: 1, // First page
  pageSize: 20, // 20 items per page
};
```

### 10.2 State Variable Types

```typescript
selectedAction: string; // "All" | "APPROVE" | "REJECT"
selectedAdmin: string; // "" | UUID | CUID
fromDate: string; // "" | "YYYY-MM-DD"
toDate: string; // "" | "YYYY-MM-DD"
currentPage: number; // integer >= 1
pageSize: number; // integer 1-100
```

### 10.3 State Update Rules

1. **Filter Changes:** Reset `currentPage` to `1`
2. **Page Changes:** Maintain all filter values
3. **Clear Filters:** Reset all filters to default state
4. **Validation:** Validate state before API request
5. **Formatting:** Format dates as `YYYY-MM-DD` before API request

---

## 11. Implementation Checklist

### Phase 1: State Setup

- [ ] Define `FilterState` interface
- [ ] Define `DEFAULT_FILTER_STATE` constant
- [ ] Initialize all state variables with `useState`
- [ ] Set default values correctly

### Phase 2: State Handlers

- [ ] Implement `handleActionChange`
- [ ] Implement `handleAdminChange`
- [ ] Implement `handleFromDateChange`
- [ ] Implement `handleToDateChange`
- [ ] Implement `handlePageChange`
- [ ] Implement `handleClearFilters`

### Phase 3: Validation

- [ ] Implement `validateFilterState` function
- [ ] Add validation to search handler
- [ ] Display validation errors to user

### Phase 4: API Integration

- [ ] Implement `buildApiParams` function
- [ ] Update `fetchAuditLogs` to use state variables
- [ ] Map state to API parameters correctly

### Phase 5: Testing

- [ ] Test default state initialization
- [ ] Test filter state updates
- [ ] Test page reset on filter change
- [ ] Test validation logic
- [ ] Test clear filters functionality

---

## 12. Code Example: Complete Implementation

```typescript
"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";

interface FilterState {
  selectedAction: string;
  selectedAdmin: string;
  fromDate: string;
  toDate: string;
  currentPage: number;
  pageSize: number;
}

const DEFAULT_FILTER_STATE: FilterState = {
  selectedAction: "All",
  selectedAdmin: "",
  fromDate: "",
  toDate: "",
  currentPage: 1,
  pageSize: 20,
};

export function AuditLogsTable() {
  // Filter state
  const [selectedAction, setSelectedAction] = useState<string>(
    DEFAULT_FILTER_STATE.selectedAction
  );
  const [selectedAdmin, setSelectedAdmin] = useState<string>(
    DEFAULT_FILTER_STATE.selectedAdmin
  );
  const [fromDate, setFromDate] = useState<string>(
    DEFAULT_FILTER_STATE.fromDate
  );
  const [toDate, setToDate] = useState<string>(DEFAULT_FILTER_STATE.toDate);
  const [currentPage, setCurrentPage] = useState<number>(
    DEFAULT_FILTER_STATE.currentPage
  );
  const [pageSize] = useState<number>(DEFAULT_FILTER_STATE.pageSize);

  // Handlers
  const handleActionChange = (action: string) => {
    setSelectedAction(action);
    setCurrentPage(1);
  };

  const handleAdminChange = (adminId: string) => {
    setSelectedAdmin(adminId.trim());
    setCurrentPage(1);
  };

  const handleFromDateChange = (date: Date | undefined) => {
    setFromDate(date ? format(date, "yyyy-MM-dd") : "");
    setCurrentPage(1);
  };

  const handleToDateChange = (date: Date | undefined) => {
    setToDate(date ? format(date, "yyyy-MM-dd") : "");
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSelectedAction(DEFAULT_FILTER_STATE.selectedAction);
    setSelectedAdmin(DEFAULT_FILTER_STATE.selectedAdmin);
    setFromDate(DEFAULT_FILTER_STATE.fromDate);
    setToDate(DEFAULT_FILTER_STATE.toDate);
    setCurrentPage(DEFAULT_FILTER_STATE.currentPage);
  };

  // Build API parameters from state
  const buildApiParams = (): URLSearchParams => {
    const params = new URLSearchParams();

    if (selectedAction !== "All") {
      params.append("actionType", selectedAction);
    }

    if (selectedAdmin.trim()) {
      params.append("adminID", selectedAdmin.trim());
    }

    if (fromDate) {
      params.append("dateFrom", fromDate);
    }

    if (toDate) {
      params.append("dateTo", toDate);
    }

    params.append("page", String(currentPage));
    params.append("limit", String(pageSize));

    return params;
  };

  // Fetch function
  const fetchAuditLogs = useCallback(async () => {
    const params = buildApiParams();
    // ... API call logic
  }, [selectedAction, selectedAdmin, fromDate, toDate, currentPage, pageSize]);

  // ... rest of component
}
```

---

## 13. Conclusion

This specification defines:

✅ **All required state variables** with types and default values  
✅ **Default state definition** (`DEFAULT_FILTER_STATE`)  
✅ **State management patterns** using React hooks  
✅ **State update handlers** with proper reset logic  
✅ **Validation logic** for state integrity  
✅ **API parameter mapping** from state to request  
✅ **Complete implementation example**

**Default State Summary:**

- `selectedAction`: `"All"`
- `selectedAdmin`: `""`
- `fromDate`: `""`
- `toDate`: `""`
- `currentPage`: `1`
- `pageSize`: `20`

**Status:** ✅ **READY FOR IMPLEMENTATION**
