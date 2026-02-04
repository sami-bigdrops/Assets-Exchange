# Audit Logs Query String Generator - Specification

**Date:** 2024  
**Purpose:** Generate URL query strings from filter state  
**Status:** 📋 **SPECIFICATION**

---

## Query Parameter Rules

### Rule 1: Action Parameter

- **Include:** `action=[ACTION]` if Action filter is `"APPROVE"` or `"REJECT"`
- **Omit:** If Action filter is `"All"`

### Rule 2: Admin ID Parameter

- **Include:** `adminId=[ADMIN_ID]` if an Admin is selected (non-empty)
- **Omit:** If Admin is empty or not selected

### Rule 3: Date Range Parameters

- **Include:** `from=[FROM_DATE]` if From date is set (non-empty)
- **Include:** `to=[TO_DATE]` if To date is set (non-empty)
- **Omit:** If date is empty or not set

### Rule 4: Concatenation

- Combine parameters using `&` symbol
- Only include parameters that have values based on above rules

### Rule 5: Pagination

- Append pagination parameters at the end
- Use same `&` concatenation
- Include `page=[PAGE]` and `limit=[LIMIT]` (if applicable)

---

## Implementation

### TypeScript Function

```typescript
interface FilterState {
  selectedAction: string; // "All" | "APPROVE" | "REJECT"
  selectedAdmin: string; // Admin ID or empty string
  fromDate: string; // YYYY-MM-DD or empty string
  toDate: string; // YYYY-MM-DD or empty string
  currentPage: number; // Page number (default: 1)
  pageSize: number; // Items per page (default: 20)
}

/**
 * Generates a URL query string from filter state
 * @param filters - Filter state object
 * @returns URL query string (without leading ?)
 */
function generateQueryString(filters: FilterState): string {
  const params: string[] = [];

  // Rule 1: Action parameter
  if (
    filters.selectedAction === "APPROVE" ||
    filters.selectedAction === "REJECT"
  ) {
    params.push(`action=${encodeURIComponent(filters.selectedAction)}`);
  }
  // Omit if "All"

  // Rule 2: Admin ID parameter
  if (filters.selectedAdmin && filters.selectedAdmin.trim()) {
    params.push(`adminId=${encodeURIComponent(filters.selectedAdmin.trim())}`);
  }
  // Omit if empty

  // Rule 3: Date range parameters
  if (filters.fromDate && filters.fromDate.trim()) {
    params.push(`from=${encodeURIComponent(filters.fromDate.trim())}`);
  }
  // Omit if empty

  if (filters.toDate && filters.toDate.trim()) {
    params.push(`to=${encodeURIComponent(filters.toDate.trim())}`);
  }
  // Omit if empty

  // Rule 5: Pagination parameters (always append at end)
  params.push(`page=${encodeURIComponent(String(filters.currentPage))}`);
  params.push(`limit=${encodeURIComponent(String(filters.pageSize))}`);

  // Rule 4: Concatenate with &
  return params.join("&");
}
```

### Alternative: Using URLSearchParams (Recommended)

```typescript
/**
 * Generates a URL query string from filter state using URLSearchParams
 * @param filters - Filter state object
 * @returns URL query string (without leading ?)
 */
function generateQueryString(filters: FilterState): string {
  const params = new URLSearchParams();

  // Rule 1: Action parameter
  if (
    filters.selectedAction === "APPROVE" ||
    filters.selectedAction === "REJECT"
  ) {
    params.append("action", filters.selectedAction);
  }

  // Rule 2: Admin ID parameter
  if (filters.selectedAdmin && filters.selectedAdmin.trim()) {
    params.append("adminId", filters.selectedAdmin.trim());
  }

  // Rule 3: Date range parameters
  if (filters.fromDate && filters.fromDate.trim()) {
    params.append("from", filters.fromDate.trim());
  }

  if (filters.toDate && filters.toDate.trim()) {
    params.append("to", filters.toDate.trim());
  }

  // Rule 5: Pagination parameters (always append at end)
  params.append("page", String(filters.currentPage));
  params.append("limit", String(filters.pageSize));

  // Rule 4: Return query string (URLSearchParams handles encoding and & concatenation)
  return params.toString();
}
```

---

## Examples

### Example 1: All Filters Applied

**Input:**

```typescript
{
  selectedAction: "APPROVE",
  selectedAdmin: "admin-123",
  fromDate: "2024-01-01",
  toDate: "2024-01-31",
  currentPage: 1,
  pageSize: 20
}
```

**Output:**

```
action=APPROVE&adminId=admin-123&from=2024-01-01&to=2024-01-31&page=1&limit=20
```

### Example 2: Action Set to "All" (Omit Action Parameter)

**Input:**

```typescript
{
  selectedAction: "All",
  selectedAdmin: "admin-456",
  fromDate: "2024-02-01",
  toDate: "",
  currentPage: 2,
  pageSize: 20
}
```

**Output:**

```
adminId=admin-456&from=2024-02-01&page=2&limit=20
```

**Note:** `action` parameter is omitted because Action is "All". `to` parameter is omitted because `toDate` is empty.

### Example 3: Only Action Filter

**Input:**

```typescript
{
  selectedAction: "REJECT",
  selectedAdmin: "",
  fromDate: "",
  toDate: "",
  currentPage: 1,
  pageSize: 20
}
```

**Output:**

```
action=REJECT&page=1&limit=20
```

**Note:** Only `action` parameter included (not "All"), other filters omitted because empty.

### Example 4: Only Date Range

**Input:**

```typescript
{
  selectedAction: "All",
  selectedAdmin: "",
  fromDate: "2024-03-01",
  toDate: "2024-03-31",
  currentPage: 1,
  pageSize: 50
}
```

**Output:**

```
from=2024-03-01&to=2024-03-31&page=1&limit=50
```

**Note:** `action` omitted (is "All"), `adminId` omitted (empty), only date range included.

### Example 5: No Filters (Default State)

**Input:**

```typescript
{
  selectedAction: "All",
  selectedAdmin: "",
  fromDate: "",
  toDate: "",
  currentPage: 1,
  pageSize: 20
}
```

**Output:**

```
page=1&limit=20
```

**Note:** Only pagination parameters included, all filters omitted.

### Example 6: Only From Date (No To Date)

**Input:**

```typescript
{
  selectedAction: "All",
  selectedAdmin: "",
  fromDate: "2024-04-01",
  toDate: "",
  currentPage: 3,
  pageSize: 10
}
```

**Output:**

```
from=2024-04-01&page=3&limit=10
```

**Note:** `to` parameter omitted because `toDate` is empty.

### Example 7: Complex Filter Combination

**Input:**

```typescript
{
  selectedAction: "REJECT",
  selectedAdmin: "user-789",
  fromDate: "2024-05-15",
  toDate: "2024-05-20",
  currentPage: 5,
  pageSize: 25
}
```

**Output:**

```
action=REJECT&adminId=user-789&from=2024-05-15&to=2024-05-20&page=5&limit=25
```

---

## Usage in Component

### Integration Example

```typescript
"use client";

import { useState, useCallback } from "react";

interface FilterState {
  selectedAction: string;
  selectedAdmin: string;
  fromDate: string;
  toDate: string;
  currentPage: number;
  pageSize: number;
}

function generateQueryString(filters: FilterState): string {
  const params = new URLSearchParams();

  // Rule 1: Action
  if (
    filters.selectedAction === "APPROVE" ||
    filters.selectedAction === "REJECT"
  ) {
    params.append("action", filters.selectedAction);
  }

  // Rule 2: Admin ID
  if (filters.selectedAdmin && filters.selectedAdmin.trim()) {
    params.append("adminId", filters.selectedAdmin.trim());
  }

  // Rule 3: Date range
  if (filters.fromDate && filters.fromDate.trim()) {
    params.append("from", filters.fromDate.trim());
  }

  if (filters.toDate && filters.toDate.trim()) {
    params.append("to", filters.toDate.trim());
  }

  // Rule 5: Pagination
  params.append("page", String(filters.currentPage));
  params.append("limit", String(filters.pageSize));

  return params.toString();
}

export function AuditLogsTable() {
  const [selectedAction, setSelectedAction] = useState<string>("All");
  const [selectedAdmin, setSelectedAdmin] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(20);

  const fetchAuditLogs = useCallback(async () => {
    const filterState: FilterState = {
      selectedAction,
      selectedAdmin,
      fromDate,
      toDate,
      currentPage,
      pageSize,
    };

    const queryString = generateQueryString(filterState);
    const url = `/api/admin/audit-logs?${queryString}`;

    const response = await fetch(url);
    // ... handle response
  }, [selectedAction, selectedAdmin, fromDate, toDate, currentPage, pageSize]);

  // ... rest of component
}
```

---

## Test Cases

### Test Case 1: Action = "All"

```typescript
Input: { selectedAction: "All", selectedAdmin: "", fromDate: "", toDate: "", currentPage: 1, pageSize: 20 }
Expected: "page=1&limit=20"
Result: ✅ action parameter omitted
```

### Test Case 2: Action = "APPROVE"

```typescript
Input: { selectedAction: "APPROVE", selectedAdmin: "", fromDate: "", toDate: "", currentPage: 1, pageSize: 20 }
Expected: "action=APPROVE&page=1&limit=20"
Result: ✅ action parameter included
```

### Test Case 3: Action = "REJECT"

```typescript
Input: { selectedAction: "REJECT", selectedAdmin: "", fromDate: "", toDate: "", currentPage: 1, pageSize: 20 }
Expected: "action=REJECT&page=1&limit=20"
Result: ✅ action parameter included
```

### Test Case 4: Admin ID Empty

```typescript
Input: { selectedAction: "All", selectedAdmin: "", fromDate: "", toDate: "", currentPage: 1, pageSize: 20 }
Expected: "page=1&limit=20"
Result: ✅ adminId parameter omitted
```

### Test Case 5: Admin ID Set

```typescript
Input: { selectedAction: "All", selectedAdmin: "admin-123", fromDate: "", toDate: "", currentPage: 1, pageSize: 20 }
Expected: "adminId=admin-123&page=1&limit=20"
Result: ✅ adminId parameter included
```

### Test Case 6: From Date Empty

```typescript
Input: { selectedAction: "All", selectedAdmin: "", fromDate: "", toDate: "2024-01-31", currentPage: 1, pageSize: 20 }
Expected: "to=2024-01-31&page=1&limit=20"
Result: ✅ from parameter omitted
```

### Test Case 7: To Date Empty

```typescript
Input: { selectedAction: "All", selectedAdmin: "", fromDate: "2024-01-01", toDate: "", currentPage: 1, pageSize: 20 }
Expected: "from=2024-01-01&page=1&limit=20"
Result: ✅ to parameter omitted
```

### Test Case 8: Both Dates Set

```typescript
Input: { selectedAction: "All", selectedAdmin: "", fromDate: "2024-01-01", toDate: "2024-01-31", currentPage: 1, pageSize: 20 }
Expected: "from=2024-01-01&to=2024-01-31&page=1&limit=20"
Result: ✅ both date parameters included
```

### Test Case 9: All Filters + Pagination

```typescript
Input: { selectedAction: "APPROVE", selectedAdmin: "admin-123", fromDate: "2024-01-01", toDate: "2024-01-31", currentPage: 5, pageSize: 50 }
Expected: "action=APPROVE&adminId=admin-123&from=2024-01-01&to=2024-01-31&page=5&limit=50"
Result: ✅ all parameters included in correct order
```

### Test Case 10: Special Characters in Admin ID

```typescript
Input: { selectedAction: "All", selectedAdmin: "admin@123#test", fromDate: "", toDate: "", currentPage: 1, pageSize: 20 }
Expected: "adminId=admin%40123%23test&page=1&limit=20"
Result: ✅ URL encoding applied correctly
```

---

## Parameter Encoding

### URL Encoding

The function should properly encode parameter values:

- **Spaces:** ` ` → `%20` or `+`
- **Special Characters:** `@` → `%40`, `#` → `%23`, etc.
- **Unicode:** Proper UTF-8 encoding

**Using URLSearchParams:**

- Automatically handles URL encoding
- Recommended approach

**Manual Encoding:**

- Use `encodeURIComponent()` for each parameter value
- More control but more code

---

## Edge Cases

### Edge Case 1: Whitespace in Admin ID

```typescript
Input: {
  selectedAdmin: "  admin-123  ";
}
Expected: "adminId=admin-123"(trimmed);
```

### Edge Case 2: Empty String vs Undefined

```typescript
// Both should be treated as "not set"
Input: { fromDate: "" }      → Omit parameter
Input: { fromDate: undefined } → Omit parameter
```

### Edge Case 3: Page = 1

```typescript
// Page 1 is still included (always include pagination)
Input: {
  currentPage: 1;
}
Expected: "page=1&limit=20";
```

### Edge Case 4: Zero Values

```typescript
// Empty strings are falsy, but 0 is truthy
Input: { currentPage: 0 } → Should still include "page=0" (though invalid)
// Recommendation: Validate page >= 1 before generating query
```

---

## Complete Utility Function

```typescript
/**
 * Generates URL query string from audit logs filter state
 *
 * Rules:
 * 1. Include action=[ACTION] only if Action is "APPROVE" or "REJECT"
 * 2. Include adminId=[ADMIN_ID] only if Admin is selected (non-empty)
 * 3. Include from=[FROM_DATE] if From date is set
 * 4. Include to=[TO_DATE] if To date is set
 * 5. Always include pagination parameters at the end
 *
 * @param filters - Filter state object
 * @returns URL query string (without leading ?)
 */
export function generateAuditLogsQueryString(filters: {
  selectedAction: string;
  selectedAdmin: string;
  fromDate: string;
  toDate: string;
  currentPage: number;
  pageSize: number;
}): string {
  const params = new URLSearchParams();

  // Rule 1: Action parameter (only if APPROVE or REJECT)
  if (
    filters.selectedAction === "APPROVE" ||
    filters.selectedAction === "REJECT"
  ) {
    params.append("action", filters.selectedAction);
  }

  // Rule 2: Admin ID parameter (only if non-empty)
  const trimmedAdmin = filters.selectedAdmin?.trim() || "";
  if (trimmedAdmin) {
    params.append("adminId", trimmedAdmin);
  }

  // Rule 3: Date range parameters (only if non-empty)
  const trimmedFromDate = filters.fromDate?.trim() || "";
  if (trimmedFromDate) {
    params.append("from", trimmedFromDate);
  }

  const trimmedToDate = filters.toDate?.trim() || "";
  if (trimmedToDate) {
    params.append("to", trimmedToDate);
  }

  // Rule 5: Pagination parameters (always included at end)
  params.append("page", String(filters.currentPage));
  params.append("limit", String(filters.pageSize));

  return params.toString();
}
```

---

## Summary

✅ **Action Parameter:** Include only if "APPROVE" or "REJECT", omit if "All"  
✅ **Admin ID Parameter:** Include only if non-empty, omit if empty  
✅ **Date Parameters:** Include `from` if From date set, include `to` if To date set  
✅ **Concatenation:** Use `&` to combine parameters  
✅ **Pagination:** Always append `page` and `limit` at the end  
✅ **URL Encoding:** Properly encode parameter values  
✅ **Whitespace Handling:** Trim values before inclusion

**Status:** ✅ **READY FOR IMPLEMENTATION**
