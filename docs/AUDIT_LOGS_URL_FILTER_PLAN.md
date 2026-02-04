# Audit Logs Filter Bar with URL Query Parameters - Implementation Plan

**Date:** 2024  
**Status:** 📋 **PLANNING**

---

## Executive Summary

This document provides a detailed roadmap for implementing URL query parameter integration in the Audit Logs page. The implementation will allow users to share filtered views via URL, bookmark specific filters, and maintain filter state across page refreshes.

---

## 1. Locate the Audit Logs Table ✅

### Component Location

**File:** `features/admin/components/AuditLogsTable.tsx`  
**Lines:** 57-377  
**Type:** Client Component (`"use client"`)

**Current Structure:**

```57:377:features/admin/components/AuditLogsTable.tsx
export function AuditLogsTable() {
  const [adminID, setAdminID] = useState<string>("");
  const [actionType, setActionType] = useState<string>("All");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState(1);
  // ... rest of component
}
```

**Key Details:**

- ✅ Component is self-contained with all filter UI and data fetching logic
- ✅ Currently uses local React state (`useState`) for all filter values
- ✅ Filter bar is already implemented (lines 166-278)
- ✅ Table rendering is at lines 280-374

**Integration Point:**

- Component is exported from `features/admin/components/AuditLogsTable.tsx`
- **Note:** Currently not exported in `features/admin/index.ts` (may need to add export)
- **Note:** Not currently rendered in `AdminDashboard.tsx` (may need to add to dashboard)

---

## 2. Identify Data Fetching Mechanism ✅

### Data Fetching Function

**Function Name:** `fetchAuditLogs`  
**Location:** `features/admin/components/AuditLogsTable.tsx`  
**Lines:** 69-129  
**Type:** `useCallback` hook

**Current Implementation:**

```69:129:features/admin/components/AuditLogsTable.tsx
const fetchAuditLogs = useCallback(
  async (currentPage: number = page) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (adminID.trim()) {
        params.append("adminID", adminID.trim());
      }

      if (actionType !== "All") {
        params.append("actionType", actionType);
      }

      if (dateFrom) {
        params.append("dateFrom", format(dateFrom, "yyyy-MM-dd"));
      }

      if (dateTo) {
        params.append("dateTo", format(dateTo, "yyyy-MM-dd"));
      }

      params.append("page", String(currentPage));
      params.append("limit", String(limit));

      const response = await fetch(
        `/api/admin/audit-logs?${params.toString()}`
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: AuditLogsResponse = await response.json();

      if (data.success) {
        setLogs(data.data);
        setMeta(data.meta);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch audit logs";
      setError(message);
      toast.error("Error loading audit logs", {
        description: message,
      });
      setLogs([]);
      setMeta(null);
    } finally {
      setIsLoading(false);
    }
  },
  [adminID, actionType, dateFrom, dateTo, limit, page]
);
```

**Key Details:**

- ✅ Function builds `URLSearchParams` from local state
- ✅ Makes `fetch` request to `/api/admin/audit-logs`
- ✅ Handles errors and loading states
- ✅ Updates local state (`logs`, `meta`) with results

**API Endpoint:**

- **Path:** `/api/admin/audit-logs`
- **File:** `app/api/admin/audit-logs/route.ts`
- **Method:** `GET`
- **Supports Query Parameters:**
  - `adminID` / `adminId` (string)
  - `actionType` / `action` (enum: "APPROVE" | "REJECT")
  - `dateFrom` / `from` (date string: YYYY-MM-DD)
  - `dateTo` / `to` (date string: YYYY-MM-DD)
  - `page` (number, default: 1)
  - `limit` (number, default: 20, max: 100)

**Confirmation:** ✅ **CONFIRMED**

- The function `fetchAuditLogs` at line 69 in `features/admin/components/AuditLogsTable.tsx` is responsible for fetching audit logs
- It makes API calls to `/api/admin/audit-logs` with query parameters
- The API endpoint is already implemented and functional

---

## 3. Understand Pagination ✅

### Current Pagination Implementation

**Location:** `features/admin/components/AuditLogsTable.tsx`  
**Lines:** 62, 93-94, 152-157, 345-371

**State Management:**

```62:62:features/admin/components/AuditLogsTable.tsx
const [page, setPage] = useState(1);
```

**Pagination Parameters:**

```93:94:features/admin/components/AuditLogsTable.tsx
params.append("page", String(currentPage));
params.append("limit", String(limit));
```

**Page Change Handler:**

```152:157:features/admin/components/AuditLogsTable.tsx
const handlePageChange = (newPage: number) => {
  if (newPage >= 1 && meta && newPage <= meta.totalPages) {
    setPage(newPage);
    fetchAuditLogs(newPage);
  }
};
```

**Pagination UI:**

```345:371:features/admin/components/AuditLogsTable.tsx
{meta && meta.totalPages > 1 && (
  <div className="flex items-center justify-between p-4 border-t">
    <div className="text-sm text-muted-foreground">
      Showing page {meta.page} of {meta.totalPages} ({meta.total} total results)
    </div>
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handlePageChange(page - 1)}
        disabled={page === 1 || isLoading}
      >
        Previous
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handlePageChange(page + 1)}
        disabled={page >= meta.totalPages || isLoading}
      >
        Next
      </Button>
    </div>
  </div>
)}
```

**Pagination Details:**

- ✅ **Type:** Offset-based pagination (page/limit)
- ✅ **Default Page:** 1
- ✅ **Default Limit:** 20 (hardcoded at line 63)
- ✅ **Max Limit:** 100 (enforced by API validation)
- ✅ **Pagination Metadata:** Returned in `meta` object:
  - `page`: Current page number
  - `limit`: Items per page
  - `total`: Total matching records
  - `totalPages`: Calculated total pages

**Behavior:**

- ✅ When filters change, page resets to 1 (line 148)
- ✅ When page changes, filters are maintained (line 155)
- ✅ Pagination buttons disabled at boundaries (first/last page)

---

## 4. Implement Query Parameter Integration 📋

### 4.1 Add Next.js URL Query Parameter Support

**Required Changes:**

#### Step 1: Import `useSearchParams` and `useRouter`

**Location:** `features/admin/components/AuditLogsTable.tsx`  
**Line:** ~5 (after existing imports)

**Add:**

```typescript
import { useSearchParams, useRouter } from "next/navigation";
```

**Why:**

- `useSearchParams` reads URL query parameters
- `useRouter` updates URL without page reload

#### Step 2: Initialize URL Query Parameter Reading

**Location:** `features/admin/components/AuditLogsTable.tsx`  
**Line:** ~57 (inside component, after state declarations)

**Add:**

```typescript
const searchParams = useSearchParams();
const router = useRouter();
```

#### Step 3: Sync URL Parameters to State on Mount

**Location:** `features/admin/components/AuditLogsTable.tsx`  
**Line:** ~160 (replace existing `useEffect` or add new one)

**Current Code (lines 160-162):**

```typescript
useEffect(() => {
  fetchAuditLogs(1);
}, [fetchAuditLogs]);
```

**Replace With:**

```typescript
// Initialize state from URL parameters on mount
useEffect(() => {
  const urlAdminID = searchParams.get("adminID") || "";
  const urlActionType = searchParams.get("actionType") || "All";
  const urlDateFrom = searchParams.get("dateFrom");
  const urlDateTo = searchParams.get("dateTo");
  const urlPage = searchParams.get("page");

  // Update state from URL
  if (urlAdminID !== adminID) setAdminID(urlAdminID);
  if (urlActionType !== actionType) setActionType(urlActionType);
  if (urlDateFrom) {
    const parsedDate = new Date(urlDateFrom);
    if (
      !isNaN(parsedDate.getTime()) &&
      parsedDate.getTime() !== dateFrom?.getTime()
    ) {
      setDateFrom(parsedDate);
    }
  }
  if (urlDateTo) {
    const parsedDate = new Date(urlDateTo);
    if (
      !isNaN(parsedDate.getTime()) &&
      parsedDate.getTime() !== dateTo?.getTime()
    ) {
      setDateTo(parsedDate);
    }
  }
  if (urlPage) {
    const parsedPage = parseInt(urlPage, 10);
    if (!isNaN(parsedPage) && parsedPage >= 1 && parsedPage !== page) {
      setPage(parsedPage);
    }
  }
}, []); // Run only on mount

// Fetch data when state changes (including URL-initiated changes)
useEffect(() => {
  fetchAuditLogs(page);
}, [fetchAuditLogs, page]);
```

**Note:** This approach may cause dependency issues. See **Alternative Approach** below.

#### Step 4: Update URL When Filters Change

**Location:** `features/admin/components/AuditLogsTable.tsx`  
**Function:** `handleSearch` (line 131)

**Current Code:**

```typescript
const handleSearch = () => {
  // Validate dates
  if (dateFrom && dateTo && dateFrom > dateTo) {
    toast.error("Invalid date range", {
      description: "dateFrom must be less than or equal to dateTo",
    });
    return;
  }

  // Validate adminID if provided
  if (adminID.trim() && isNaN(Number(adminID.trim()))) {
    toast.error("Invalid Admin ID", {
      description: "Admin ID must be a valid number",
    });
    return;
  }

  setPage(1);
  fetchAuditLogs(1);
};
```

**Update To:**

```typescript
const handleSearch = () => {
  // Validate dates
  if (dateFrom && dateTo && dateFrom > dateTo) {
    toast.error("Invalid date range", {
      description: "dateFrom must be less than or equal to dateTo",
    });
    return;
  }

  // Validate adminID if provided
  if (adminID.trim() && isNaN(Number(adminID.trim()))) {
    toast.error("Invalid Admin ID", {
      description: "Admin ID must be a valid number",
    });
    return;
  }

  // Update URL with current filter values
  updateURLParams({
    adminID: adminID.trim() || null,
    actionType: actionType !== "All" ? actionType : null,
    dateFrom: dateFrom ? format(dateFrom, "yyyy-MM-dd") : null,
    dateTo: dateTo ? format(dateTo, "yyyy-MM-dd") : null,
    page: 1, // Reset to page 1 on new search
  });

  setPage(1);
  fetchAuditLogs(1);
};
```

#### Step 5: Create URL Update Helper Function

**Location:** `features/admin/components/AuditLogsTable.tsx`  
**Line:** ~130 (before `handleSearch`)

**Add:**

```typescript
const updateURLParams = (params: {
  adminID?: string | null;
  actionType?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  page?: number | null;
}) => {
  const current = new URLSearchParams(Array.from(searchParams.entries()));

  // Update or remove parameters
  if (params.adminID !== undefined) {
    if (params.adminID) {
      current.set("adminID", params.adminID);
    } else {
      current.delete("adminID");
    }
  }

  if (params.actionType !== undefined) {
    if (params.actionType) {
      current.set("actionType", params.actionType);
    } else {
      current.delete("actionType");
    }
  }

  if (params.dateFrom !== undefined) {
    if (params.dateFrom) {
      current.set("dateFrom", params.dateFrom);
    } else {
      current.delete("dateFrom");
    }
  }

  if (params.dateTo !== undefined) {
    if (params.dateTo) {
      current.set("dateTo", params.dateTo);
    } else {
      current.delete("dateTo");
    }
  }

  if (params.page !== undefined) {
    if (params.page && params.page > 1) {
      current.set("page", String(params.page));
    } else {
      current.delete("page");
    }
  }

  // Update URL without page reload
  const search = current.toString();
  const query = search ? `?${search}` : "";
  router.push(`/dashboard${query}`, { scroll: false });
};
```

#### Step 6: Update Page Change Handler

**Location:** `features/admin/components/AuditLogsTable.tsx`  
**Function:** `handlePageChange` (line 152)

**Current Code:**

```typescript
const handlePageChange = (newPage: number) => {
  if (newPage >= 1 && meta && newPage <= meta.totalPages) {
    setPage(newPage);
    fetchAuditLogs(newPage);
  }
};
```

**Update To:**

```typescript
const handlePageChange = (newPage: number) => {
  if (newPage >= 1 && meta && newPage <= meta.totalPages) {
    setPage(newPage);
    updateURLParams({ page: newPage });
    fetchAuditLogs(newPage);
  }
};
```

#### Step 7: Update Filter Change Handlers (Optional - Auto-sync)

**Location:** `features/admin/components/AuditLogsTable.tsx`  
**Lines:** 178, 190, 222, 249

**Option A: Auto-sync on change (debounced)**

- Add debounced effect to sync URL when filter values change
- Pros: Real-time URL updates
- Cons: May cause too many URL updates

**Option B: Sync only on Search button click (Recommended)**

- Keep current behavior: URL updates only when "Search" is clicked
- Pros: Cleaner URL, less noise
- Cons: URL doesn't reflect intermediate filter changes

**Recommendation:** Use Option B (sync only on Search click) for better UX.

---

### 4.2 Alternative Approach: Single Source of Truth

**Problem:** The current approach may cause state synchronization issues between URL and local state.

**Solution:** Use URL as single source of truth, read from URL on every render.

**Implementation:**

1. **Remove local state for filters** (keep only for UI interactions)
2. **Read filter values from URL on every render**
3. **Update URL immediately when filters change**
4. **Fetch data based on URL parameters**

**Trade-offs:**

- ✅ Single source of truth (URL)
- ✅ No state sync issues
- ⚠️ More URL updates (may affect browser history)
- ⚠️ Requires careful handling of URL parsing

**Recommendation:** Start with the first approach (state + URL sync), and refactor to single source of truth if issues arise.

---

### 4.3 Handle Edge Cases

#### Case 1: Invalid URL Parameters

**Location:** URL parameter parsing logic

**Add Validation:**

```typescript
// Validate actionType from URL
const urlActionType = searchParams.get("actionType");
if (urlActionType && !["APPROVE", "REJECT"].includes(urlActionType)) {
  // Invalid action type, remove from URL
  updateURLParams({ actionType: null });
}
```

#### Case 2: Date Format Validation

**Location:** Date parsing logic

**Add:**

```typescript
// Validate date format
const urlDateFrom = searchParams.get("dateFrom");
if (urlDateFrom) {
  const parsedDate = new Date(urlDateFrom);
  if (isNaN(parsedDate.getTime())) {
    // Invalid date, remove from URL
    updateURLParams({ dateFrom: null });
  }
}
```

#### Case 3: Page Number Validation

**Location:** Page parsing logic

**Add:**

```typescript
// Validate page number
const urlPage = searchParams.get("page");
if (urlPage) {
  const parsedPage = parseInt(urlPage, 10);
  if (isNaN(parsedPage) || parsedPage < 1) {
    // Invalid page, remove from URL
    updateURLParams({ page: 1 });
  }
}
```

#### Case 4: Clear Filters Button

**Location:** Add new button in filter section (line ~256)

**Add:**

```typescript
const handleClearFilters = () => {
  setAdminID("");
  setActionType("All");
  setDateFrom(undefined);
  setDateTo(undefined);
  setPage(1);

  // Clear URL parameters
  router.push("/dashboard", { scroll: false });

  // Fetch with no filters
  fetchAuditLogs(1);
};
```

**Add Button:**

```typescript
<Button
  variant="outline"
  onClick={handleClearFilters}
  disabled={isLoading}
>
  Clear Filters
</Button>
```

---

## 5. Confirmation ✅

### 5.1 Component Location Confirmed

✅ **Audit Logs Table Component:**

- **File:** `features/admin/components/AuditLogsTable.tsx`
- **Lines:** 57-377
- **Type:** Client Component

### 5.2 Data Fetching Mechanism Confirmed

✅ **Function Name:** `fetchAuditLogs`  
✅ **Location:** `features/admin/components/AuditLogsTable.tsx`, line 69  
✅ **Type:** `useCallback` hook  
✅ **API Endpoint:** `/api/admin/audit-logs`  
✅ **Method:** `GET`  
✅ **Query Parameters Supported:**

- `adminID` / `adminId`
- `actionType` / `action`
- `dateFrom` / `from`
- `dateTo` / `to`
- `page`
- `limit`

### 5.3 Pagination Confirmed

✅ **Type:** Offset-based (page/limit)  
✅ **Default:** page=1, limit=20  
✅ **State:** `page` state variable (line 62)  
✅ **Handler:** `handlePageChange` (line 152)  
✅ **UI:** Lines 345-371

### 5.4 API Endpoint Confirmed

✅ **Endpoint:** `GET /api/admin/audit-logs`  
✅ **File:** `app/api/admin/audit-logs/route.ts`  
✅ **Status:** Implemented and functional  
✅ **Validation:** Comprehensive input validation  
✅ **Response Format:** `{ success: true, data: [], meta: {} }`

---

## Implementation Checklist

### Phase 1: Setup (30 minutes)

- [ ] Add `useSearchParams` and `useRouter` imports
- [ ] Initialize hooks in component
- [ ] Create `updateURLParams` helper function
- [ ] Test URL parameter reading

### Phase 2: URL Sync (1 hour)

- [ ] Implement URL → State sync on mount
- [ ] Update `handleSearch` to sync state → URL
- [ ] Update `handlePageChange` to sync page → URL
- [ ] Test filter changes update URL
- [ ] Test page changes update URL

### Phase 3: Edge Cases (30 minutes)

- [ ] Add URL parameter validation
- [ ] Handle invalid dates
- [ ] Handle invalid page numbers
- [ ] Handle invalid action types
- [ ] Add "Clear Filters" button

### Phase 4: Testing (1 hour)

- [ ] Test: Direct URL with filters loads correctly
- [ ] Test: Filter changes update URL
- [ ] Test: Page refresh maintains filters
- [ ] Test: Shareable URLs work
- [ ] Test: Browser back/forward buttons
- [ ] Test: Invalid URL parameters handled gracefully

### Phase 5: Documentation (15 minutes)

- [ ] Update component comments
- [ ] Document URL parameter format
- [ ] Add usage examples

---

## Code References Summary

| Item              | Location                                       | Lines                |
| ----------------- | ---------------------------------------------- | -------------------- |
| **Component**     | `features/admin/components/AuditLogsTable.tsx` | 57-377               |
| **Data Fetching** | `features/admin/components/AuditLogsTable.tsx` | 69-129               |
| **API Endpoint**  | `app/api/admin/audit-logs/route.ts`            | 187-225              |
| **Filter State**  | `features/admin/components/AuditLogsTable.tsx` | 58-63                |
| **Pagination**    | `features/admin/components/AuditLogsTable.tsx` | 62, 152-157, 345-371 |
| **Filter UI**     | `features/admin/components/AuditLogsTable.tsx` | 166-278              |
| **Table UI**      | `features/admin/components/AuditLogsTable.tsx` | 280-374              |

---

## Expected Behavior After Implementation

### User Flow 1: Direct URL Access

1. User visits `/dashboard?actionType=APPROVE&page=2`
2. Component reads URL parameters
3. Filter UI reflects URL values (Action Type = "APPROVE", Page = 2)
4. Component fetches data with filters
5. Table displays filtered results

### User Flow 2: Filter Changes

1. User selects "REJECT" in Action Type dropdown
2. User clicks "Search" button
3. URL updates to `/dashboard?actionType=REJECT&page=1`
4. Component fetches filtered data
5. Table updates with new results

### User Flow 3: Page Refresh

1. User has filters applied: `/dashboard?adminID=123&actionType=APPROVE`
2. User refreshes page
3. Component reads URL parameters on mount
4. Filter UI shows previous values
5. Component fetches data with same filters
6. Table displays same results

### User Flow 4: Shareable Link

1. User applies filters and gets URL: `/dashboard?actionType=REJECT&dateFrom=2024-01-01`
2. User shares URL with colleague
3. Colleague opens URL
4. Colleague sees same filtered view
5. Both users see same results

---

## Next Steps

1. **Review this plan** with the team
2. **Implement Phase 1** (Setup)
3. **Test URL parameter reading** works correctly
4. **Implement Phase 2** (URL Sync)
5. **Test filter changes** update URL
6. **Implement Phase 3** (Edge Cases)
7. **Complete Phase 4** (Testing)
8. **Finalize Phase 5** (Documentation)

---

## Notes

- The API endpoint already supports all required query parameters
- No backend changes are needed
- Implementation is frontend-only
- Uses Next.js App Router patterns (`useSearchParams`, `useRouter`)
- Maintains backward compatibility with existing filter functionality

---

**Status:** ✅ **READY FOR IMPLEMENTATION**
