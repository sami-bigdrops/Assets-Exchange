# Creative Request Workflow - Complete Visualization

## Overview

This document visualizes the complete creative request workflow using the **unified single-entity model**.

---

## The Unified Model in One Picture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   CREATIVE REQUEST LIFECYCLE - ONE Record, Multiple States                 │
│                                                                             │
│   Database Table: creative_requests                                        │
│   ONE row per creative submission                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│  PUBLISHER   │
│   SUBMITS    │
│  CREATIVE    │
└──────┬───────┘
       │
       ↓
┌─────────────────────────────────────────────────────────────────┐
│ CREATE Record                                                   │
│ ─────────────────────────────────────────────────────────────── │
│ id: "req-1"                                                     │
│ offerId: "5001" ← IMMUTABLE                                     │
│ offerName: "Amazon Holiday Campaign" ← IMMUTABLE                │
│ creativeType: "Email" ← IMMUTABLE                               │
│ creativeCount: 3 ← IMMUTABLE                                    │
│ fromLinesCount: 2 ← IMMUTABLE                                   │
│ subjectLinesCount: 3 ← IMMUTABLE                                │
│                                                                 │
│ status: "new" ← MUTABLE (changes with workflow)                │
│ approvalStage: "admin" ← MUTABLE (changes with workflow)        │
│ priority: "High Priority"                                       │
│                                                                 │
│ admin_status: "pending"                                         │
│ advertiser_status: null                                         │
│ submitted_at: "2024-12-20T10:00:00Z"                            │
└─────────────────────────────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────┐
│  DISPLAYS IN ADMIN UI                    │
│  ────────────────────────────────────    │
│  📍 Location: /requests → "New" tab      │
│  🎯 Visible To: Admin                    │
│  ⚡ Action: Admin can Approve or Reject  │
└──────────────────────────────────────────┘
       │
       ↓ Admin clicks "Approve and Forward"
       │
┌─────────────────────────────────────────────────────────────────┐
│ UPDATE Same Record (req-1)                                      │
│ ─────────────────────────────────────────────────────────────── │
│ offerId: "5001" ← STILL SAME                                    │
│ offerName: "Amazon Holiday Campaign" ← STILL SAME               │
│ creativeType: "Email" ← STILL SAME                              │
│ creativeCount: 3 ← STILL SAME                                   │
│                                                                 │
│ status: "pending" ← CHANGED                                     │
│ approvalStage: "advertiser" ← CHANGED                           │
│                                                                 │
│ admin_status: "approved" ← CHANGED                              │
│ admin_approved_by: "admin-123" ← ADDED                          │
│ admin_approved_at: "2024-12-21T14:30:00Z" ← ADDED               │
│ admin_comments: "Approved after review" ← ADDED                 │
│                                                                 │
│ advertiser_status: "pending" ← CHANGED                          │
│ updated_at: "2024-12-21T14:30:00Z" ← UPDATED                    │
└─────────────────────────────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────────────┐
│  DISPLAYS IN MULTIPLE PLACES                             │
│  ──────────────────────────────────────────────────────  │
│  📍 /requests → "Pending Approvals" tab                  │
│     (Admin can see what's with advertiser)               │
│                                                          │
│  📍 /response → "New" tab                                │
│     (Shows requests waiting for advertiser action)       │
│                                                          │
│  🎯 Visible To: Admin (both pages)                       │
│  ⏳ Status: Awaiting advertiser decision                 │
└──────────────────────────────────────────────────────────┘
       │
       ↓ Advertiser Reviews
       │
       ├─── Path A: Advertiser APPROVES ───────────────────────────┐
       │                                                            │
       │  ┌──────────────────────────────────────────────────────┐ │
       │  │ UPDATE Same Record (req-1)                           │ │
       │  │ ──────────────────────────────────────────────────── │ │
       │  │ offerId: "5001" ← STILL SAME                         │ │
       │  │ offerName: "Amazon Holiday Campaign" ← STILL SAME    │ │
       │  │                                                      │ │
       │  │ status: "approved" ← CHANGED                         │ │
       │  │ approvalStage: "completed" ← CHANGED                 │ │
       │  │                                                      │ │
       │  │ advertiser_status: "approved" ← CHANGED              │ │
       │  │ advertiser_responded_by: "adv-456" ← ADDED           │ │
       │  │ advertiser_responded_at: "2024-12-22" ← ADDED        │ │
       │  │ advertiser_comments: "Approved" ← ADDED              │ │
       │  └──────────────────────────────────────────────────────┘ │
       │         │                                                  │
       │         ↓                                                  │
       │  ┌──────────────────────────────────────────┐             │
       │  │  ✅ WORKFLOW COMPLETE                    │             │
       │  │  ────────────────────────────────────    │             │
       │  │  📍 /requests → "Approved" tab           │             │
       │  │  📍 /response → "Approved" tab           │             │
       │  │  🎯 Status: Final Approved               │             │
       │  └──────────────────────────────────────────┘             │
       │                                                            │
       ├─── Path B: Advertiser REJECTS ─────────────────────────────┤
       │                                                            │
       │  ┌──────────────────────────────────────────────────────┐ │
       │  │ UPDATE Same Record (req-1)                           │ │
       │  │ ──────────────────────────────────────────────────── │ │
       │  │ status: "rejected" ← CHANGED                         │ │
       │  │ approvalStage: "advertiser" ← STAYS                  │ │
       │  │                                                      │ │
       │  │ advertiser_status: "rejected" ← CHANGED              │ │
       │  │ advertiser_responded_by: "adv-456" ← ADDED           │ │
       │  │ advertiser_comments: "Not suitable" ← ADDED          │ │
       │  └──────────────────────────────────────────────────────┘ │
       │         │                                                  │
       │         ↓                                                  │
       │  ┌──────────────────────────────────────────┐             │
       │  │  ❌ WORKFLOW ENDED                        │             │
       │  │  ────────────────────────────────────    │             │
       │  │  📍 /response → "Rejected" tab           │             │
       │  │  🎯 Status: Rejected by Advertiser       │             │
       │  └──────────────────────────────────────────┘             │
       │                                                            │
       └─── Path C: Advertiser SENDS BACK ──────────────────────────┤
                                                                    │
          ┌──────────────────────────────────────────────────────┐ │
          │ UPDATE Same Record (req-1)                           │ │
          │ ──────────────────────────────────────────────────── │ │
          │ status: "sent-back" ← CHANGED                        │ │
          │ approvalStage: "advertiser" ← STAYS                  │ │
          │                                                      │ │
          │ advertiser_status: "sent_back" ← CHANGED             │ │
          │ advertiser_responded_by: "adv-456" ← ADDED           │ │
          │ advertiser_comments: "Need revisions" ← ADDED        │ │
          └──────────────────────────────────────────────────────┘ │
                 │                                                  │
                 ↓                                                  │
          ┌──────────────────────────────────────────┐             │
          │  🔄 CYCLED BACK TO ADMIN                 │             │
          │  ────────────────────────────────────    │             │
          │  📍 /requests → "Sent Back" tab          │             │
          │  🎯 Visible To: Admin                    │             │
          │  ⚡ Action: Admin can re-review          │             │
          └──────────────┬───────────────────────────┘             │
                         │                                         │
                         ↓ Admin Reviews Again                     │
                         │                                         │
          ┌──────────────────────────────────────────┐             │
          │ UPDATE Same Record (req-1) AGAIN         │             │
          │ ──────────────────────────────────────── │             │
          │ status: "rejected" ← FINAL               │             │
          │ approvalStage: "advertiser"              │             │
          └──────────────────────────────────────────┘             │
                         │                                         │
                         ↓                                         │
          ┌──────────────────────────────────────────┐             │
          │  ❌ FINAL REJECTION                       │             │
          │  ────────────────────────────────────    │             │
          │  📍 /requests → "Rejected" tab           │             │
          └──────────────────────────────────────────┘             │

```

---

## Database Record Evolution

### Record Lifecycle

```typescript
// STEP 1: Publisher Submits (Dec 20)
{
  id: "req-1",
  offerId: "5001",
  offerName: "Amazon Holiday Campaign",
  creativeType: "Email",
  creativeCount: 3,
  fromLinesCount: 2,
  subjectLinesCount: 3,
  advertiserName: "Amazon Affiliates",
  affiliateId: "AFF-8901",
  clientId: "CLI-1001",
  clientName: "Digital Media Group",
  priority: "High Priority",

  // Workflow state
  status: "new",
  approvalStage: "admin",

  // Admin tracking
  admin_status: "pending",
  admin_approved_by: null,
  admin_approved_at: null,
  admin_comments: null,

  // Advertiser tracking
  advertiser_status: null,
  advertiser_responded_by: null,
  advertiser_responded_at: null,
  advertiser_comments: null,

  // Timestamps
  submitted_at: "2024-12-20T10:00:00Z",
  updated_at: "2024-12-20T10:00:00Z"
}

// STEP 2: Admin Approves (Dec 21)
// SAME RECORD - Only changed fields shown
{
  id: "req-1",  // ← SAME
  offerId: "5001",  // ← SAME
  offerName: "Amazon Holiday Campaign",  // ← SAME
  // ... all creative details SAME ...

  status: "pending",  // ← CHANGED
  approvalStage: "advertiser",  // ← CHANGED

  admin_status: "approved",  // ← CHANGED
  admin_approved_by: "admin-123",  // ← NEW
  admin_approved_at: "2024-12-21T14:30:00Z",  // ← NEW
  admin_comments: "Looks good",  // ← NEW

  advertiser_status: "pending",  // ← CHANGED

  updated_at: "2024-12-21T14:30:00Z"  // ← UPDATED
}

// STEP 3: Advertiser Approves (Dec 22)
// STILL SAME RECORD
{
  id: "req-1",  // ← STILL SAME
  offerId: "5001",  // ← STILL SAME
  offerName: "Amazon Holiday Campaign",  // ← STILL SAME
  // ... all creative details STILL SAME ...

  status: "approved",  // ← CHANGED
  approvalStage: "completed",  // ← CHANGED

  admin_status: "approved",  // ← UNCHANGED
  admin_approved_by: "admin-123",  // ← UNCHANGED
  admin_approved_at: "2024-12-21T14:30:00Z",  // ← UNCHANGED
  admin_comments: "Looks good",  // ← UNCHANGED

  advertiser_status: "approved",  // ← CHANGED
  advertiser_responded_by: "adv-456",  // ← NEW
  advertiser_responded_at: "2024-12-22T09:15:00Z",  // ← NEW
  advertiser_comments: "Approved",  // ← NEW

  updated_at: "2024-12-22T09:15:00Z"  // ← UPDATED
}
```

**Key Insight:** The `offerId`, `offerName`, and all creative details **NEVER CHANGE**. Only status and approval tracking fields change.

---

## UI Display Logic

### Admin Dashboard - /requests Page

```
┌─────────────────────────────────────────────────────────────────┐
│  MANAGE REQUESTS (Admin View)                                   │
├─────────────────────────────────────────────────────────────────┤
│  [All] [New] [Pending Approvals] [Approved] [Rejected] [Sent Back] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  "New" Tab (4 requests)                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Filter: WHERE status = 'new' AND approval_stage = 'admin'     │
│                                                                 │
│  ▶ req-1: Offer 5001 - Amazon Holiday Campaign                 │
│    [Approve and Forward] [Reject and Send Back]                │
│                                                                 │
│  ▶ req-2: Offer 5002 - Google B2B Leads                        │
│    [Approve and Forward] [Reject and Send Back]                │
│                                                                 │
│  "Pending Approvals" Tab (3 requests)                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Filter: WHERE status = 'pending' AND approval_stage = 'advertiser' │
│                                                                 │
│  ▶ req-4: Offer 5004 - Facebook Lead Gen                       │
│    [View Request]  ← Admin already approved, with advertiser   │
│                                                                 │
│  "Sent Back" Tab (3 requests)                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Filter: WHERE status = 'sent-back' AND approval_stage = 'advertiser' │
│                                                                 │
│  ▶ req-11: Offer 5011 - Uber Corporate                         │
│    Badge: "Returned by Advertiser"                             │
│    [Reject and Send Back]  ← Admin can send back to advertiser │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Data Source: creative_requests table (all records)
Filtering: Client-side by status + approvalStage
```

### Admin Dashboard - /response Page

```
┌─────────────────────────────────────────────────────────────────┐
│  MANAGE RESPONSES (Advertiser Activity View)                    │
├─────────────────────────────────────────────────────────────────┤
│  [All] [New] [Approved] [Rejected]                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  "New" Tab (3 requests)                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Filter: WHERE status = 'pending' AND approval_stage = 'advertiser' │
│  (SAME requests as /requests "Pending Approvals")               │
│                                                                 │
│  ▶ req-4: Offer 5004 - Facebook Lead Gen                       │
│    Badge: "Pending Advertiser Approval"                        │
│    [View Request]  ← Awaiting advertiser action                │
│                                                                 │
│  ▶ req-5: Offer 5005 - Booking.com Hotels                      │
│    Badge: "Pending Advertiser Approval"                        │
│    [View Request]                                               │
│                                                                 │
│  "Approved" Tab (3 requests)                                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Filter: WHERE status = 'approved' AND approval_stage = 'completed' │
│                                                                 │
│  ▶ req-6: Offer 5006 - Adobe Creative Suite                    │
│    Badge: "Fully Approved"                                     │
│    [View Request]                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Data Source: SAME creative_requests table
Filtering: WHERE approval_stage IN ('advertiser', 'completed')
           AND NOT (status = 'sent-back')

Note: This shows the SAME creative requests from /requests page,
      just filtered to show ones that reached advertiser stage.
```

---

## Complete State Matrix

| Status      | Approval Stage | Location                                     | Who Acts   | Available Actions           |
| ----------- | -------------- | -------------------------------------------- | ---------- | --------------------------- |
| `new`       | `admin`        | /requests "New"                              | Admin      | Approve, Reject             |
| `pending`   | `advertiser`   | /requests "Pending"<br>/response "New"       | Advertiser | Approve, Reject, Send Back  |
| `approved`  | `completed`    | /requests "Approved"<br>/response "Approved" | None       | View only                   |
| `rejected`  | `admin`        | /requests "Rejected"                         | None       | View only                   |
| `rejected`  | `advertiser`   | /requests "Rejected"<br>/response "Rejected" | None       | View only                   |
| `sent-back` | `advertiser`   | /requests "Sent Back"                        | Admin      | Reject (send to advertiser) |

---

## Audit Trail Example

**creative_request_history table** (separate table for complete history):

```sql
request_id | action_type          | old_status | new_status | old_stage | new_stage   | action_by | action_at           | comments
-----------|----------------------|------------|------------|-----------|-------------|-----------|---------------------|------------------
req-1      | publisher_submitted  | NULL       | new        | NULL      | admin       | pub-789   | 2024-12-20 10:00:00 | Initial submission
req-1      | admin_approved       | new        | pending    | admin     | advertiser  | admin-123 | 2024-12-21 14:30:00 | Looks good
req-1      | advertiser_sent_back | pending    | sent-back  | advertiser| advertiser  | adv-456   | 2024-12-22 09:00:00 | Need different subject lines
req-1      | admin_rejected       | sent-back  | rejected   | advertiser| advertiser  | admin-123 | 2024-12-22 16:00:00 | Cannot accommodate
```

**Query to get complete history:**

```sql
SELECT * FROM creative_request_history
WHERE request_id = 'req-1'
ORDER BY action_at ASC;
```

This gives you the complete timeline of ONE creative request!

---

## Query Examples

### Get Requests Needing Admin Action

```sql
SELECT * FROM creative_requests
WHERE status = 'new' AND approval_stage = 'admin'
   OR (status = 'sent-back' AND approval_stage = 'advertiser')
ORDER BY submitted_at DESC;
```

### Get Requests With Advertiser

```sql
SELECT * FROM creative_requests
WHERE status = 'pending' AND approval_stage = 'advertiser'
ORDER BY submitted_at DESC;
```

### Get Completed Approvals

```sql
SELECT * FROM creative_requests
WHERE status = 'approved' AND approval_stage = 'completed'
ORDER BY updated_at DESC;
```

### Get All Rejections

```sql
SELECT * FROM creative_requests
WHERE status = 'rejected'
ORDER BY updated_at DESC;
```

---

## Benefits Visualization

```
OLD MODEL (WRONG):
═══════════════════════════════════════════════════════════════

publisher_requests table          advertiser_responses table
┌─────────────────────┐          ┌─────────────────────┐
│ req-1               │          │ resp-1              │
│ Offer: 5001         │──link──→ │ Offer: 5001 ✓       │
│ Holiday Campaign    │          │ Holiday Campaign ✓  │
└─────────────────────┘          └─────────────────────┘

┌─────────────────────┐          ┌─────────────────────┐
│ req-2               │          │ resp-2              │
│ Offer: 5002         │──link──→ │ Offer: 5014 ✗ WRONG!│
│ B2B Software        │          │ Cloud Services ✗    │
└─────────────────────┘          └─────────────────────┘

Issues:
❌ Data duplication
❌ Data inconsistency
❌ Complex queries (JOIN)
❌ Unclear source of truth
❌ Synchronization problems


NEW MODEL (CORRECT):
═══════════════════════════════════════════════════════════════

creative_requests table (ONE table, ONE source of truth)
┌────────────────────────────────────────────────────────────┐
│ req-1                                                      │
│ Offer: 5001 (immutable)                                    │
│ Holiday Campaign (immutable)                               │
│ Status: new → pending → approved (mutable)                 │
│ ApprovalStage: admin → advertiser → completed (mutable)    │
│ Admin fields: who, when, comments                          │
│ Advertiser fields: who, when, comments                     │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ req-2                                                      │
│ Offer: 5002 (immutable) ← STAYS SAME FOREVER              │
│ B2B Software (immutable) ← STAYS SAME FOREVER             │
│ Status: new → pending → sent-back (mutable)                │
│ ApprovalStage: admin → advertiser (mutable)                │
│ Admin fields: approved, admin-123, 2024-12-21              │
│ Advertiser fields: sent_back, adv-456, "needs revision"   │
└────────────────────────────────────────────────────────────┘

Benefits:
✅ No data duplication
✅ Offer details always consistent
✅ Simple queries (no JOIN)
✅ Single source of truth
✅ Easy to understand
✅ Better performance
```

---

## Status Badge Logic

The same creative request shows different badges based on its current state:

```typescript
// req-1 status badge evolution:

When status='new', approvalStage='admin':
  Badge: "New" (blue)

When status='pending', approvalStage='advertiser':
  Badge: "Pending Advertiser Approval" (yellow)

When status='approved', approvalStage='completed':
  Badge: "Fully Approved" (green)

When status='rejected', approvalStage='admin':
  Badge: "Rejected by Admin" (red)

When status='rejected', approvalStage='advertiser':
  Badge: "Rejected by Advertiser" (red)

When status='sent-back', approvalStage='advertiser':
  Badge: "Returned by Advertiser" (purple)
```

---

## Real-World Scenario

**Creative Submission:** Email campaign for Amazon Holiday Sale

```
Day 1 - Dec 20, 10:00 AM
═══════════════════════════════════════════════════════════════
ACTION: Publisher (Digital Media Group) submits creative
OFFER: 5001 - Amazon Holiday Campaign
CREATIVE: 3 email creatives, 2 from lines, 3 subject lines

DATABASE:
  CREATE creative_requests record "req-1"
  - All offer details stored
  - status = 'new'
  - approval_stage = 'admin'

UI DISPLAY:
  ✓ Appears in /requests → "New" tab
  ✓ Admin sees: "New" badge
  ✓ Actions: [Approve and Forward] [Reject and Send Back]


Day 2 - Dec 21, 2:30 PM
═══════════════════════════════════════════════════════════════
ACTION: Admin (John) reviews and approves
COMMENT: "Creative looks great, forwarding to Amazon"

DATABASE:
  UPDATE req-1 (SAME record)
  - status = 'pending'
  - approval_stage = 'advertiser'
  - admin_status = 'approved'
  - admin_approved_by = 'john-admin-123'
  - admin_approved_at = '2024-12-21 14:30:00'
  - admin_comments = 'Creative looks great...'

HISTORY TABLE:
  INSERT creative_request_history
  - action: 'admin_approved'
  - old_status: 'new' → new_status: 'pending'

UI DISPLAY:
  ✗ Removed from /requests → "New" tab
  ✓ Appears in /requests → "Pending Approvals" tab
  ✓ Appears in /response → "New" tab
  ✓ Badge: "Pending Advertiser Approval"
  ✓ Actions: [View Request] only


Day 3 - Dec 22, 9:00 AM
═══════════════════════════════════════════════════════════════
ACTION: Advertiser (Amazon - Sarah) sends back
COMMENT: "Please use different subject lines, current ones too generic"

DATABASE:
  UPDATE req-1 (STILL SAME record)
  - status = 'sent-back'
  - advertiser_status = 'sent_back'
  - advertiser_responded_by = 'sarah-adv-456'
  - advertiser_responded_at = '2024-12-22 09:00:00'
  - advertiser_comments = 'Please use different subject lines...'

HISTORY TABLE:
  INSERT creative_request_history
  - action: 'advertiser_sent_back'
  - old_status: 'pending' → new_status: 'sent-back'

UI DISPLAY:
  ✗ Removed from /response → "New" tab
  ✓ Appears in /requests → "Sent Back" tab
  ✓ Badge: "Returned by Advertiser"
  ✓ Actions: [Reject and Send Back] (admin can send to advertiser)


Day 4 - Dec 22, 4:00 PM
═══════════════════════════════════════════════════════════════
ACTION: Admin (John) reviews and makes final decision
COMMENT: "We cannot accommodate this request at this time"

DATABASE:
  UPDATE req-1 (FOREVER SAME record)
  - status = 'rejected'
  - (approval_stage stays 'advertiser')

HISTORY TABLE:
  INSERT creative_request_history
  - action: 'admin_final_rejection'
  - old_status: 'sent-back' → new_status: 'rejected'

UI DISPLAY:
  ✗ Removed from /requests → "Sent Back" tab
  ✓ Appears in /requests → "Rejected" tab
  ✓ Badge: "Rejected by Advertiser" (or custom label)
  ✓ Actions: [View Request] only

═══════════════════════════════════════════════════════════════
FINAL RESULT:
  - ONE database record (req-1)
  - Offer 5001 throughout entire lifecycle
  - Complete audit trail in history table
  - Clear final status: Rejected
```

---

## Comparison Chart

| Aspect                           | Old Model                                                                                                         | New Model                                                             |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Publisher submits Offer 5001** | Creates `req-1` in publisher_requests                                                                             | Creates `req-1` in creative_requests                                  |
| **Admin approves**               | Creates `resp-1` in advertiser_responses<br>Links via child_response_id                                           | Updates `req-1`<br>status → 'pending'<br>approvalStage → 'advertiser' |
| **Offer ID in "response"**       | Could be different! (e.g., 5014) ❌                                                                               | Always same (5001) ✓                                                  |
| **Database records**             | 2 records (req-1 + resp-1)                                                                                        | 1 record (req-1)                                                      |
| **Data query**                   | `SELECT ... FROM publisher_requests pr`<br>`JOIN advertiser_responses ar`<br>`WHERE pr.child_response_id = ar.id` | `SELECT ... FROM creative_requests`<br>`WHERE id = 'req-1'`           |
| **Source of truth**              | Unclear                                                                                                           | Clear (one record)                                                    |
| **History tracking**             | Spread across tables                                                                                              | Centralized audit table                                               |

---

## Summary

### What We Fixed

1. ✅ **Data consistency** - Same offer throughout lifecycle
2. ✅ **Data integrity** - No duplication
3. ✅ **Clarity** - One creative = one record
4. ✅ **Simplicity** - No complex linking
5. ✅ **Performance** - Simple queries, no JOINs

### How We Fixed It

- Created unified `creative-request.model.ts` with consistent data
- Updated service layer to use single data source
- Updated all components with clarifying comments
- Marked old files as deprecated
- Documented the complete workflow

### Result

A clean, production-ready architecture where:

- ONE creative submission = ONE database record
- Status and approval stage track progress
- Offer details are immutable
- Complete history tracked separately
- Easy to understand and maintain

---

For complete conceptual explanation, see: [UNIFIED_MODEL_EXPLANATION.md](./UNIFIED_MODEL_EXPLANATION.md)
