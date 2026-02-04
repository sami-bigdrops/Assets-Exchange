# Audit Logs Filter Bar - UI Design Specification

**Date:** 2024  
**Component:** Filter Bar for Audit Logs Table  
**Status:** 📐 **DESIGN SPECIFICATION**

---

## Executive Summary

This document provides a detailed UI/UX design specification for the Audit Logs filter bar. The filter bar will be placed above the audit logs table and will provide intuitive controls for filtering audit log data by action type, administrator, and date range.

---

## 1. Placement & Layout

### 1.1 Page Placement

**Location:** Above the audit logs table  
**Container:** Within a card component with border and background  
**Spacing:** 16px (1rem) vertical spacing between filter bar and table

**Visual Hierarchy:**

```
┌─────────────────────────────────────────┐
│  Page Header / Title                     │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐ │
│  │  Filter Bar (Card Container)      │ │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ │ │
│  │  │Action│ │Admin│ │From │ │ To  │ │ │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ │ │
│  │  ┌──────────┐ ┌──────────┐        │ │
│  │  │  Search  │ │  Clear   │        │ │
│  │  └──────────┘ └──────────┘        │ │
│  └───────────────────────────────────┘ │
├─────────────────────────────────────────┤
│  Audit Logs Table                       │
│  ┌─────┬─────┬─────┬─────┬─────┐       │
│  │ ID  │Admin│Action│Time │ ... │       │
│  ├─────┼─────┼─────┼─────┼─────┤       │
│  │ ... │ ... │ ... │ ... │ ... │       │
│  └─────┴─────┴─────┴─────┴─────┘       │
└─────────────────────────────────────────┘
```

### 1.2 Container Design

**Card Container:**

- **Background:** `bg-card` (theme-aware card background)
- **Border:** `border` (1px solid border)
- **Border Radius:** `rounded-lg` (8px)
- **Padding:** `p-4` (16px on all sides)
- **Shadow:** None (flat design, consistent with existing patterns)

**Section Title:**

- **Text:** "Filter Audit Logs"
- **Font Size:** `text-lg` (18px)
- **Font Weight:** `font-semibold` (600)
- **Margin Bottom:** `mb-4` (16px)
- **Color:** Default text color (theme-aware)

---

## 2. Filter Controls Layout

### 2.1 Grid System

**Responsive Grid Layout:**

- **Mobile (< 768px):** 1 column (stacked vertically)
- **Tablet (768px - 1024px):** 2 columns
- **Desktop (> 1024px):** 5 columns (filters) + 2 columns (buttons) = 7 total columns

**Grid Configuration:**

```css
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4
```

**Column Distribution:**

1. **Action Dropdown:** 1 column
2. **Admin Input:** 1 column
3. **From Date Picker:** 1 column
4. **To Date Picker:** 1 column
5. **Action Buttons:** 1 column (contains both Search and Clear buttons)

**Gap:** `gap-4` (16px between grid items)

### 2.2 Control Grouping

**Filter Controls Row:**

- Action, Admin, From Date, To Date, Buttons (5 columns on desktop)

**Button Row (Alternative Layout - Optional):**

- If buttons don't fit in same row, place them in a separate row below filters
- Full-width buttons on mobile, side-by-side on desktop

---

## 3. Individual Control Specifications

### 3.1 Action Dropdown

**Type:** Select/Dropdown Menu  
**Label:** "Action Type"  
**Placeholder:** "Select action type"  
**Options:**

- "All" (default, shows all actions)
- "Approve" (filters to APPROVE actions)
- "Reject" (filters to REJECT actions)

**Visual Design:**

- **Component:** shadcn/ui `Select` component
- **Trigger Style:** `SelectTrigger` with default styling
- **Width:** Full width of grid column
- **Height:** Default input height (40px)
- **Border:** Default border styling
- **Background:** Default input background
- **Text Color:** Default text color
- **Icon:** Chevron down icon (built into Select component)

**Interaction:**

- Click to open dropdown
- Click option to select
- Selected value displayed in trigger
- "All" option clears action filter

**State Indicators:**

- Default: Shows "All" or placeholder
- Selected: Shows selected option text
- Hover: Highlight on hover
- Focus: Focus ring on keyboard navigation

**Accessibility:**

- Proper `label` association with `htmlFor` attribute
- Keyboard navigation support
- ARIA attributes (handled by Select component)

---

### 3.2 Admin Input Field

**Type:** Text Input Field  
**Label:** "Admin ID"  
**Placeholder:** "Enter admin ID"  
**Input Type:** `text`  
**Required:** No (optional field)

**Visual Design:**

- **Component:** shadcn/ui `Input` component
- **Width:** Full width of grid column
- **Height:** Default input height (40px)
- **Border:** Default border styling
- **Border Radius:** Default input radius (6px)
- **Background:** Default input background
- **Text Color:** Default text color
- **Placeholder Color:** Muted foreground color

**Interaction:**

- Type to enter admin ID
- Supports Enter key to trigger search
- Clear button (X icon) appears when text is entered (optional enhancement)
- Auto-trim whitespace on submit

**Validation:**

- No validation on input (allows any text)
- Validation occurs on Search button click
- Error message displayed if invalid format

**State Indicators:**

- Default: Empty with placeholder
- Focus: Focus ring
- Error: Red border and error message below
- Disabled: Grayed out (when loading)

**Accessibility:**

- Proper `label` association
- `aria-describedby` for error messages
- Keyboard navigation support

---

### 3.3 From Date Picker

**Type:** Date Picker (Calendar Popover)  
**Label:** "Date From"  
**Placeholder:** "Select date"  
**Format:** YYYY-MM-DD (display and submission)

**Visual Design:**

- **Trigger:** Button styled as input field
- **Component:** shadcn/ui `Popover` + `Calendar` components
- **Width:** Full width of grid column
- **Height:** Default input height (40px)
- **Button Style:** `variant="outline"`
- **Button Alignment:** `justify-start text-left`
- **Icon:** Calendar icon (lucide-react `CalendarIcon`)
- **Icon Position:** Left side, 8px margin-right
- **Text Alignment:** Left-aligned

**Button States:**

- **Empty:** Muted foreground color, placeholder text
- **Selected:** Default text color, formatted date (YYYY-MM-DD)
- **Hover:** Subtle background change
- **Focus:** Focus ring

**Calendar Popover:**

- **Position:** Below trigger, aligned to start
- **Width:** Auto (calendar component default)
- **Padding:** `p-0` (no padding, calendar handles its own)
- **Background:** Card background
- **Border:** Default popover border
- **Shadow:** Default popover shadow

**Calendar Component:**

- **Mode:** Single date selection
- **Initial Focus:** First day of month
- **Date Format:** ISO 8601 (YYYY-MM-DD)
- **Min Date:** None (can select any past date)
- **Max Date:** Today (cannot select future dates)
- **Navigation:** Month/year navigation arrows

**Interaction:**

- Click button to open calendar
- Click date to select
- Click outside to close
- Keyboard navigation supported
- Selected date highlighted

**Date Display:**

- **Format:** YYYY-MM-DD
- **Example:** "2024-01-15"
- **Empty State:** "Select date" in muted color

---

### 3.4 To Date Picker

**Type:** Date Picker (Calendar Popover)  
**Label:** "Date To"  
**Placeholder:** "Select date"  
**Format:** YYYY-MM-DD (display and submission)

**Visual Design:**

- **Identical to From Date Picker** (same styling and behavior)
- **Calendar Min Date:** From Date (if selected) or none
- **Calendar Max Date:** Today

**Validation:**

- To Date must be >= From Date
- Error message if invalid range
- Visual error state (red border)

**Interaction:**

- Same as From Date Picker
- Calendar automatically restricts dates based on From Date selection

---

### 3.5 Search/Apply Filters Button

**Type:** Primary Action Button  
**Label:** "Search"  
**Icon:** Search icon (lucide-react `Search`)  
**Position:** Left side of button, 8px margin-right

**Visual Design:**

- **Component:** shadcn/ui `Button` component
- **Variant:** Default (primary button style)
- **Width:** Full width of grid column (on mobile)
- **Height:** Default button height (40px)
- **Background:** Primary button background color
- **Text Color:** Primary button text color
- **Border Radius:** Default button radius (6px)
- **Font Weight:** Medium (500)

**Button States:**

- **Default:** Primary background, white text
- **Hover:** Darker background shade
- **Active:** Pressed state
- **Focus:** Focus ring
- **Disabled:** Grayed out, cursor not-allowed
- **Loading:** Spinner icon replaces search icon, text changes to "Searching..."

**Loading State:**

- **Icon:** Loader2 (lucide-react) with `animate-spin` class
- **Text:** "Searching..." (replaces "Search")
- **Interaction:** Button disabled, no click allowed

**Interaction:**

- Click to apply filters and fetch data
- Validates all inputs before submission
- Shows loading state during API call
- Resets to page 1 on new search
- Updates URL query parameters (if URL sync implemented)

**Accessibility:**

- Proper button semantics
- Keyboard support (Enter key)
- Loading state announced to screen readers

---

### 3.6 Clear/Reset Button

**Type:** Secondary Action Button  
**Label:** "Clear"  
**Icon:** X icon (lucide-react `X`) or no icon  
**Position:** Right side of button row (if separate row) or next to Search button

**Visual Design:**

- **Component:** shadcn/ui `Button` component
- **Variant:** `variant="outline"` (secondary button style)
- **Width:** Full width of grid column (on mobile), or equal width with Search (on desktop)
- **Height:** Default button height (40px)
- **Background:** Transparent or card background
- **Text Color:** Default text color
- **Border:** 1px solid border
- **Border Radius:** Default button radius (6px)

**Button States:**

- **Default:** Outline style, default text color
- **Hover:** Background color change, border color change
- **Active:** Pressed state
- **Focus:** Focus ring
- **Disabled:** Grayed out (when loading or no filters applied)

**Interaction:**

- Click to clear all filters
- Resets all inputs to default values:
  - Action: "All"
  - Admin ID: Empty
  - From Date: Undefined
  - To Date: Undefined
  - Page: 1
- Fetches data with no filters
- Clears URL query parameters (if URL sync implemented)

**Accessibility:**

- Proper button semantics
- Keyboard support
- Clear indication of action

---

## 4. Responsive Design

### 4.1 Mobile (< 768px)

**Layout:**

- Single column layout
- All controls stacked vertically
- Full-width buttons
- Reduced padding (p-3 instead of p-4)

**Control Order:**

1. Action Dropdown
2. Admin Input
3. From Date Picker
4. To Date Picker
5. Search Button
6. Clear Button

**Spacing:**

- Gap: 12px (gap-3)
- Padding: 12px (p-3)

### 4.2 Tablet (768px - 1024px)

**Layout:**

- 2-column grid
- Controls arranged in 2 columns

**Control Arrangement:**

```
Row 1: [Action] [Admin]
Row 2: [From Date] [To Date]
Row 3: [Search] [Clear]
```

**Spacing:**

- Gap: 16px (gap-4)
- Padding: 16px (p-4)

### 4.3 Desktop (> 1024px)

**Layout:**

- 5-column grid for filters
- Buttons in same row or separate row

**Control Arrangement:**

```
Row 1: [Action] [Admin] [From Date] [To Date] [Buttons]
```

**Alternative (if buttons don't fit):**

```
Row 1: [Action] [Admin] [From Date] [To Date]
Row 2: [Search] [Clear]
```

**Spacing:**

- Gap: 16px (gap-4)
- Padding: 16px (p-4)

---

## 5. Visual States & Feedback

### 5.1 Loading State

**Indicators:**

- Search button shows spinner and "Searching..." text
- All inputs disabled (grayed out)
- Cursor: not-allowed on disabled elements
- Table shows loading skeleton or spinner

**Duration:**

- Show loading state immediately on button click
- Hide when API response received (success or error)

### 5.2 Error State

**Validation Errors:**

- Red border on invalid input
- Error message below input field
- Toast notification for critical errors
- Error message text: Clear, concise, actionable

**Error Examples:**

- "Invalid date range: From date must be before To date"
- "Invalid Admin ID format"
- "Failed to load audit logs. Please try again."

### 5.3 Success State

**Indicators:**

- Filters applied successfully
- Table updates with filtered results
- URL updates (if URL sync implemented)
- No explicit success message (table update is feedback)

### 5.4 Empty State

**No Filters Applied:**

- All inputs in default state
- Placeholders visible
- Clear button disabled (optional)

**No Results:**

- Table shows "No audit logs found" message
- Suggests adjusting filters
- Filters remain visible and editable

---

## 6. Interaction Patterns

### 6.1 Filter Application Flow

1. **User selects/changes filters:**
   - Action dropdown: Immediate visual feedback
   - Admin input: Real-time typing feedback
   - Date pickers: Calendar opens, date selected

2. **User clicks Search:**
   - Validation runs
   - If valid: Loading state, API call, table updates
   - If invalid: Error messages displayed, no API call

3. **User clicks Clear:**
   - All filters reset to default
   - Table refreshes with all logs
   - URL cleared (if URL sync implemented)

### 6.2 Keyboard Navigation

**Tab Order:**

1. Action Dropdown
2. Admin Input
3. From Date Picker
4. To Date Picker
5. Search Button
6. Clear Button

**Keyboard Shortcuts:**

- **Enter** in Admin Input: Triggers Search
- **Enter** on Search Button: Triggers Search
- **Escape** in Date Picker: Closes calendar
- **Tab**: Moves to next control
- **Shift+Tab**: Moves to previous control

### 6.3 Date Range Validation

**Real-time Validation:**

- When From Date selected, To Date calendar min date updates
- When To Date selected, validates >= From Date
- Error message if invalid range
- Visual error state (red border)

**Validation Rules:**

- From Date <= To Date
- Both dates <= Today
- Dates in valid format (YYYY-MM-DD)

---

## 7. Accessibility Requirements

### 7.1 ARIA Attributes

- **Labels:** All inputs have associated `<Label>` elements
- **Descriptions:** Error messages use `aria-describedby`
- **States:** Loading/disabled states announced
- **Roles:** Proper semantic HTML (buttons, inputs, selects)

### 7.2 Keyboard Support

- All controls keyboard accessible
- Focus indicators visible
- Tab order logical
- Enter key triggers Search
- Escape closes popovers

### 7.3 Screen Reader Support

- Labels read aloud
- Error messages announced
- Loading states announced
- Button actions described

### 7.4 Color Contrast

- Meets WCAG AA standards (4.5:1 for text)
- Error states use color + text (not color alone)
- Focus indicators visible

---

## 8. Component Structure

### 8.1 HTML Structure

```html
<div class="space-y-4">
  <!-- Filter Bar Card -->
  <div class="border rounded-lg p-4 bg-card">
    <h3 class="text-lg font-semibold mb-4">Filter Audit Logs</h3>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <!-- Action Dropdown -->
      <div class="space-y-2">
        <label htmlFor="actionType">Action Type</label>
        <select>
          ...
        </select>
      </div>

      <!-- Admin Input -->
      <div class="space-y-2">
        <label htmlFor="adminID">Admin ID</label>
        <input id="adminID" />
      </div>

      <!-- From Date -->
      <div class="space-y-2">
        <label>Date From</label>
        <Popover>
          <PopoverTrigger asChild>
            <button variant="outline">...</button>
          </PopoverTrigger>
          <PopoverContent>
            <Calendar />
          </PopoverContent>
        </Popover>
      </div>

      <!-- To Date -->
      <div class="space-y-2">
        <label>Date To</label>
        <Popover>
          <PopoverTrigger asChild>
            <button variant="outline">...</button>
          </PopoverTrigger>
          <PopoverContent>
            <Calendar />
          </PopoverContent>
        </Popover>
      </div>

      <!-- Buttons -->
      <div class="space-y-2">
        <label>&nbsp;</label>
        <div class="flex gap-2">
          <button onClick="{handleSearch}">Search</button>
          <button variant="outline" onClick="{handleClear}">Clear</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Table -->
  <div class="border rounded-lg">
    <table>
      ...
    </table>
  </div>
</div>
```

### 8.2 React Component Structure

```typescript
export function AuditLogsTable() {
  // State
  const [actionType, setActionType] = useState("All");
  const [adminID, setAdminID] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  // Handlers
  const handleSearch = () => { /* ... */ };
  const handleClear = () => { /* ... */ };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="border rounded-lg p-4 bg-card">
        {/* Filter Controls */}
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        {/* Table Content */}
      </div>
    </div>
  );
}
```

---

## 9. Design Tokens & Styling

### 9.1 Colors

**Theme-Aware Colors:**

- Background: `bg-card`
- Border: `border`
- Text: Default text color
- Muted Text: `text-muted-foreground`
- Error: `text-destructive` / `border-destructive`
- Primary Button: Default primary colors
- Outline Button: Default outline colors

### 9.2 Spacing

- **Container Padding:** 16px (p-4)
- **Grid Gap:** 16px (gap-4)
- **Label Margin:** 8px bottom (space-y-2)
- **Button Gap:** 8px (gap-2)
- **Section Spacing:** 16px (space-y-4)

### 9.3 Typography

- **Section Title:** text-lg, font-semibold
- **Labels:** Default label styling
- **Input Text:** Default input text styling
- **Button Text:** Default button text styling

### 9.4 Borders & Radius

- **Card Border:** 1px solid, rounded-lg (8px)
- **Input Border:** Default input border, rounded-md (6px)
- **Button Border:** Default button border, rounded-md (6px)

---

## 10. Implementation Notes

### 10.1 Component Library

**shadcn/ui Components Used:**

- `Button` - For date picker triggers and action buttons
- `Input` - For admin ID input
- `Select` - For action type dropdown
- `Label` - For form labels
- `Popover` - For date picker container
- `Calendar` - For date selection
- `Table` - For results display (separate component)

### 10.2 Icons

**lucide-react Icons:**

- `CalendarIcon` - Date picker trigger
- `Search` - Search button
- `Loader2` - Loading spinner
- `X` - Clear button (optional)

### 10.3 Date Formatting

**Library:** `date-fns`

- **Display Format:** `format(date, "yyyy-MM-dd")`
- **Submission Format:** ISO 8601 (YYYY-MM-DD)

### 10.4 State Management

- Local React state (`useState`)
- URL query parameters (if URL sync implemented)
- No global state needed

---

## 11. User Experience Considerations

### 11.1 Default Behavior

- **Initial Load:** No filters applied, shows all logs
- **Action Default:** "All" (shows all action types)
- **Admin Default:** Empty (no filter)
- **Dates Default:** Empty (no date filter)
- **Page Default:** 1

### 11.2 Filter Persistence

- **Current:** Filters reset on page refresh (if no URL sync)
- **With URL Sync:** Filters persist in URL, maintained on refresh
- **Recommendation:** Implement URL sync for better UX

### 11.3 Performance

- **Debouncing:** Not needed (Search button prevents excessive calls)
- **Loading States:** Immediate feedback on button click
- **Error Handling:** Graceful error messages, no crashes

### 11.4 User Guidance

- **Placeholders:** Clear, descriptive placeholders
- **Labels:** Clear, concise labels
- **Error Messages:** Actionable, specific error messages
- **Empty States:** Helpful suggestions when no results

---

## 12. Design Mockup Summary

### 12.1 Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Filter Audit Logs                                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Action Type  │  │  Admin ID    │  │  Date From    │    │
│  │ [All      ▼] │  │ [Enter ID...]│  │ [📅 Select...]│    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                              │
│  ┌──────────────┐  ┌──────────────────────────────────┐    │
│  │  Date To     │  │  [🔍 Search]  [Clear]            │    │
│  │ [📅 Select...]│  │                                  │    │
│  └──────────────┘  └──────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 12.2 Color Scheme

- **Card Background:** Light gray (light mode) / Dark gray (dark mode)
- **Border:** Light gray border
- **Inputs:** White background (light) / Dark background (dark)
- **Primary Button:** Blue background, white text
- **Outline Button:** Transparent, gray border

---

## 13. Implementation Checklist

### Phase 1: Basic Layout

- [ ] Create card container
- [ ] Add section title
- [ ] Implement responsive grid
- [ ] Add spacing and padding

### Phase 2: Filter Controls

- [ ] Implement Action dropdown
- [ ] Implement Admin input
- [ ] Implement From Date picker
- [ ] Implement To Date picker

### Phase 3: Action Buttons

- [ ] Implement Search button
- [ ] Implement Clear button
- [ ] Add loading states
- [ ] Add disabled states

### Phase 4: Validation & Error Handling

- [ ] Add date range validation
- [ ] Add error messages
- [ ] Add visual error states
- [ ] Add toast notifications

### Phase 5: Accessibility

- [ ] Add proper labels
- [ ] Add ARIA attributes
- [ ] Test keyboard navigation
- [ ] Test screen readers

### Phase 6: Polish

- [ ] Add hover states
- [ ] Add focus indicators
- [ ] Test responsive design
- [ ] Test dark mode

---

## 14. Recommendations

### 14.1 Admin Field Type

**Recommendation:** **Text Input Field** (not dropdown)

**Reasoning:**

- Admin IDs are dynamic (can be any string/UUID)
- Dropdown would require fetching all admin IDs (performance issue)
- Input field allows flexible filtering
- Supports partial matches (if backend supports)
- Better UX for large admin lists

**Alternative:** If admin list is small (< 50), consider dropdown with search capability.

### 14.2 Button Layout

**Recommendation:** **Same Row** (if space allows)

**Benefits:**

- More compact layout
- Better use of space
- Consistent with existing patterns

**Alternative:** If buttons don't fit, use separate row below filters.

### 14.3 URL Sync

**Recommendation:** **Implement URL query parameter sync**

**Benefits:**

- Shareable filter URLs
- Browser back/forward support
- Filter persistence on refresh
- Better user experience

**Implementation:** See `docs/AUDIT_LOGS_URL_FILTER_PLAN.md`

---

## 15. Conclusion

This filter bar design provides:

✅ **Clear Visual Hierarchy** - Easy to scan and understand  
✅ **Intuitive Controls** - Familiar UI patterns  
✅ **Responsive Design** - Works on all screen sizes  
✅ **Accessible** - Meets WCAG standards  
✅ **Consistent** - Matches existing design system  
✅ **Performant** - Efficient filtering and loading  
✅ **User-Friendly** - Clear feedback and error handling

**Status:** ✅ **READY FOR IMPLEMENTATION**

---

**Next Steps:**

1. Review design specification
2. Implement filter bar component
3. Integrate with existing AuditLogsTable
4. Test responsive design
5. Test accessibility
6. Deploy and gather user feedback
