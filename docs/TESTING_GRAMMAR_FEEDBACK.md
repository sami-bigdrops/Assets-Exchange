# Grammar Feedback Testing Strategy

## Phase 4: Testing Strategy

### Step 4.1 — Schema-Level Checks

#### Migration Testing

**Test: Migration runs cleanly**
```sql
-- Run migration
ALTER TABLE "external_tasks" ADD COLUMN "grammar_feedback" jsonb;

-- Verify column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'external_tasks' AND column_name = 'grammar_feedback';
-- Expected: grammar_feedback | jsonb | YES
```

**Test: Table accepts inserts without grammar_feedback**
```sql
INSERT INTO external_tasks (
  id, creative_id, source, status, result
) VALUES (
  'test-1', 'creative-1', 'grammar_ai', 'pending', '{}'::jsonb
);
-- Should succeed
```

**Test: Table accepts updates with grammar_feedback**
```sql
UPDATE external_tasks 
SET grammar_feedback = '[{"message": "Test issue", "severity": "warning"}]'::jsonb
WHERE id = 'test-1';
-- Should succeed
```

**Test: Old rows remain readable**
```sql
-- Query existing rows (should not break)
SELECT id, status, result, grammar_feedback 
FROM external_tasks 
WHERE grammar_feedback IS NULL;
-- Should return all old rows with grammar_feedback = NULL
```

### Step 4.2 — Service Logic Scenarios

#### Scenario 1: Multiple Grammar Issues

**Test Case: External API returns multiple issues**
```typescript
const resultData = {
  corrections: [
    { original: "teh", correction: "the", category: "spelling" },
    { incorrect: "its", correct: "it's", category: "punctuation" }
  ],
  issues: [
    { text: "passive voice", message: "Use active voice", severity: "info" }
  ]
};

// Expected: grammar_feedback = array with 3 entries
// - Entry 1: spelling correction (teh → the)
// - Entry 2: punctuation correction (its → it's)
// - Entry 3: style issue (passive voice)
```

**Verification:**
- `grammar_feedback.length === 3`
- Each entry has `message`, `category`, `severity`
- `originalText` and `suggestedText` populated for corrections

#### Scenario 2: Zero Issues

**Test Case: External API returns zero issues**
```typescript
const resultData = {
  corrections: [],
  issues: [],
  status: "SUCCESS"
};

// Expected: grammar_feedback = []
```

**Verification:**
- `grammar_feedback === []` (empty array, not null)
- Task status = "completed"
- `result` still contains full payload

#### Scenario 3: Unexpected Structure

**Test Case: External API returns unexpected structure**
```typescript
// Case A: corrections is object instead of array
const resultData = {
  corrections: { error: "Invalid format" },
  issues: []
};

// Case B: Missing corrections/issues keys
const resultData = {
  status: "SUCCESS",
  other_field: "value"
};

// Case C: Malformed items
const resultData = {
  corrections: [null, "not an object", 123]
};
```

**Expected Behavior:**
- `grammar_feedback = null` or `[]` (depending on parsing success)
- Job still succeeds
- `result` contains full raw response
- Error logged but doesn't break flow

**Verification:**
- Task status = "completed"
- `result` is saved
- Logs show extraction warnings/errors
- No exceptions thrown

#### Scenario 4: External API Fails

**Test Case: External API fails**
```typescript
// API returns error status
const apiResponse = {
  status: "FAILURE",
  error: "Processing failed"
};
```

**Expected Behavior:**
- `status = "failed"`
- `error_message = "AI processing failed"` (or actual error)
- `grammar_feedback = null` (untouched)
- `result = null` or error payload

**Verification:**
- Task status = "failed"
- `error_message` is set
- `grammar_feedback` is null (not attempted)
- `result` may contain error details

### Step 4.3 — End-to-End Flow

#### Test Flow: POST → Poll → Verify

**Step 1: Submit for Analysis**
```bash
POST /api/proofread-creative
{
  "creativeId": "test-creative-123",
  "fileUrl": "https://example.com/test.html"
}
```

**Expected Response:**
```json
{
  "success": true,
  "taskId": "external-task-id-123",
  "dbTaskId": "db-task-id-456",
  "status": "completed" // or "processing"
}
```

**Step 2: Poll Task Status (if async)**
```bash
GET /api/proofread-creative?taskId=external-task-id-123
```

**Expected Response:**
```json
{
  "success": true,
  "status": "completed",
  "result": { /* full raw response */ },
  "task": {
    "id": "db-task-id-456",
    "status": "completed",
    "result": { /* full raw response */ },
    "grammar_feedback": [
      {
        "category": "grammar_correction",
        "message": "\"teh\" should be \"the\"",
        "severity": "warning",
        "originalText": "teh",
        "suggestedText": "the"
      }
    ]
  }
}
```

**Step 3: Verify Status Transitions**
- Initial: `status = "processing"` or `"completed"`
- After completion: `status = "completed"`, `grammar_feedback` populated
- On failure: `status = "failed"`, `error_message` set, `grammar_feedback = null`

**Step 4: Verify No Regressions**
- Existing API consumers still work
- `result` field still contains full payload
- Status flow unchanged
- No breaking changes to response format

### Manual Testing Checklist

#### Schema Tests
- [ ] Run migration: `pnpm db:migrate`
- [ ] Verify column exists: `SELECT * FROM information_schema.columns WHERE table_name = 'external_tasks'`
- [ ] Insert row without `grammar_feedback`: Should succeed
- [ ] Insert row with `grammar_feedback`: Should succeed
- [ ] Query old rows: Should return with `grammar_feedback = NULL`

#### Service Logic Tests
- [ ] Test with multiple issues: Verify array with multiple entries
- [ ] Test with zero issues: Verify empty array `[]`
- [ ] Test with unexpected structure: Verify graceful handling
- [ ] Test with API failure: Verify `status = "failed"`, `grammar_feedback = null`

#### End-to-End Tests
- [ ] POST `/api/proofread-creative` with valid request
- [ ] Poll task status until completion
- [ ] Verify `grammar_feedback` is populated correctly
- [ ] Verify `result` still contains full payload
- [ ] Verify existing consumers still work

### Automated Test Coverage

See `__tests__/lib/services/grammar-feedback.test.ts` for unit tests covering:
- Multiple grammar issues extraction
- Zero issues handling
- Unexpected structure handling
- Field normalization
- Business logic wrapper (null vs [] vs [items])

## Phase 5: Future-Proofing

### Design Choices Made

#### 1. Structured JSON Instead of Strings

**Enables:**
- ✅ UI highlighting (can highlight specific text ranges)
- ✅ Filtering by issue type (`category` field)
- ✅ Analytics ("Top 10 grammar mistakes" by category)
- ✅ Severity-based filtering (show only errors, hide info)
- ✅ Location-based navigation (jump to line/column)

**Example Query:**
```sql
-- Find all grammar errors (not warnings/info)
SELECT * FROM external_tasks 
WHERE grammar_feedback @> '[{"severity": "error"}]'::jsonb;

-- Count issues by category
SELECT 
  jsonb_array_elements(grammar_feedback)->>'category' as category,
  COUNT(*) as count
FROM external_tasks
WHERE grammar_feedback IS NOT NULL
GROUP BY category;
```

#### 2. Keeping `result` Untouched

**Enables:**
- ✅ Debugging (full API response available)
- ✅ Re-parsing later if extraction logic improves
- ✅ Audit trail (what did the API actually return?)
- ✅ Backward compatibility (consumers can still use `result`)

**Example:**
```typescript
// Consumer can use either:
const fullResult = task.result; // Full raw payload
const issues = task.grammar_feedback; // Normalized issues
```

#### 3. Nullable Column

**Enables:**
- ✅ Safe rollout (old rows have `NULL`, new rows have data)
- ✅ Rollback capability (can drop column if needed)
- ✅ Clear semantics:
  - `NULL` = not processed / not available
  - `[]` = processed, no issues
  - `[items]` = processed, issues found

**Migration Safety:**
- No table rewrite (just adds nullable column)
- No backfill needed (can populate later if desired)
- Reversible (can drop column in down migration)

### Future Enhancements (Out of Scope)

These are design choices that enable future work but are not implemented now:

1. **Indexing for Performance**
   - Could add GIN index on `grammar_feedback` for fast queries
   - `CREATE INDEX idx_grammar_feedback_gin ON external_tasks USING GIN (grammar_feedback);`

2. **Analytics Dashboard**
   - Query `grammar_feedback` to show common mistakes
   - Track improvement over time
   - Category-based breakdowns

3. **UI Integration**
   - Display `grammar_feedback` in admin panel
   - Highlight issues in creative preview
   - Filter creatives by grammar quality

4. **Re-parsing Service**
   - Background job to re-parse old `result` data
   - Populate `grammar_feedback` for historical tasks
   - Useful if extraction logic improves
