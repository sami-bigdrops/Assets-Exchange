# Work Summary (Swapnaja) – Detailed

## 1. Upload security – magic-byte validation

### 1.1 `lib/security/validateBuffer.ts` (new)

- **Purpose:** Validate uploads by **buffer content** (magic bytes), not by client-reported type.
- **Function:** `validateBufferMagicBytes(buffer: Buffer)`.
- **Returns:** Either `{ ok: true, detectedMime, detectedExt }` or `{ ok: false, reason }`.
- **Logic:**
  - Rejects empty buffer or size &gt; 50MB (uses `MAX_FILE_SIZE` from `lib/security/route.ts`).
  - Uses `file-type` to detect MIME from magic bytes.
  - If `file-type` returns nothing (e.g. for HTML): reads first 4096 bytes as UTF-8, checks for `&lt;!doctype html`, `&lt;html`, `&lt;head`, `&lt;body`; if found and `text/html` is in `ALLOWED_MIME_TYPES`, returns `text/html` / `html`.
  - Otherwise checks detected MIME against `ALLOWED_MIME_TYPES`; if not allowed returns `Invalid file type: ${detected.mime}`.
- **Used by:** `app/api/upload/route.ts` (top-level file and each ZIP entry), `app/api/upload/process-zip/route.ts` (each extracted entry).

### 1.2 `lib/security/route.ts` (central security config)

- **Exports:**
  - **ALLOWED_MIME_TYPES:** `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `text/html`, `application/zip`, `application/x-zip-compressed`, `video/mp4`, `video/webm`.
  - **MAX_FILE_SIZE:** 50 _ 1024 _ 1024 (50MB).
  - **sanitizeFilename(filename):** Replaces non–alphanumeric (except `.` and `-`) with `_`, collapses multiple dots to one, truncates to 100 chars. Used to avoid path traversal and unsafe names.
  - **validateFile(file: File):** Client-side check: `file.type` in `ALLOWED_MIME_TYPES` and `file.size` &lt;= 50MB; returns `{ valid, error? }`.
- **Consumers:** `validateBuffer.ts` (ALLOWED_MIME_TYPES, MAX_FILE_SIZE), `app/api/upload/route.ts` (sanitizeFilename), `hooks/useFileUpload.ts` (sanitizeFilename, validateFile), `app/api/admin/uploads/auth/route.ts` (ALLOWED_MIME_TYPES, MAX_FILE_SIZE).

---

## 2. Upload API changes

### 2.1 `app/api/upload/route.ts` (main upload endpoint)

- **Input:** Either `multipart/form-data` (field `file`, optional `smartDetection` = "true") or raw body with optional query `?smartDetection=true` and `?filename=...`.
- **Validation:** Every received buffer (single file or each file inside a ZIP) is validated with `validateBufferMagicBytes()`. Invalid file returns 415 with `error`, `reason`, and for ZIP entries also `file`.
- **Single file:**
  - Filename is sanitized: `sanitizeFilename(fileName)` before `saveBuffer()`.
  - Response `fileType` uses **server-detected MIME** (`v.detectedMime`), not client `file.type`.
  - Response shape: `{ success, file: { fileId, fileName, fileUrl, fileSize, fileType, uploadDate } }`.
- **ZIP when smartDetection=true:**
  - ZIP type detected from magic bytes (`v.detectedMime` / `v.detectedExt`), not from extension.
  - Parsed with `ZipParserService.parseAndIdentifyDependencies()`.
  - Limit: 50 entries; over that returns 400 "ZIP contains too many files (Limit: 50)".
  - Each entry: validated with `validateBufferMagicBytes(entry.content)`; saved with `sanitizeFilename(entry.name.split("/").pop() || "file")` under `extracted/${zipId}`; item `type` set to **detected MIME** (`detectedType`), not `entry.type`.
  - Response: `{ success, zipAnalysis: { uploadId, isSingleCreative, items, counts: { images, htmls } } }`.
- **Python malware scan:** Block commented out (TODO when checking model is ready); `PYTHON_SERVICE_URL` fetch to `/scan` not executed.
- **Error handling:** 500 returns `error`, `details`, and optional `stack`.

### 2.2 `app/api/upload/process-zip/route.ts` (server-side ZIP from URL)

- **Input:** JSON body `{ url }` (ZIP blob URL).
- **Flow:** Fetches ZIP from `url`, converts to Buffer, parses with `ZipParserService.parseAndIdentifyDependencies()`, enforces 50-entry limit.
- **Validation:** Each extracted entry validated with `validateBufferMagicBytes(entry.content)` before save; invalid entry returns 415 with `file` and `reason`.
- **Saving:** Each entry saved via `saveBuffer(entry.content, entry.name.split("/").pop() || "file", "extracted/${zipId}")` (filename not passed through `sanitizeFilename` here; main upload route does use it for ZIP entries).
- **Types/counts:** Uses `detectedType` from validation for `type` and for image/html counts.
- **Response:** Same shape as main route ZIP branch, plus optional `mainCreative` when `htmlCount === 1`.

### 2.3 `app/api/upload/token/route.ts` (Vercel Blob client token)

- **Purpose:** Issues upload token for client-side Blob uploads (no auth check in this route; comment notes auth should be added).
- **allowedContentTypes:** image/jpeg, image/png, image/gif, image/webp, image/svg+xml, text/html, application/zip, application/x-zip-compressed. **application/octet-stream is not allowed** (commented out).
- **Options:** addRandomSuffix: true; tokenPayload optional.
- **onUploadCompleted:** Logs blob and tokenPayload (currently via console.error).

---

## 3. Use of security helpers elsewhere

### 3.1 `hooks/useFileUpload.ts`

- Imports `sanitizeFilename` and `validateFile` from `@/lib/security`.
- Before upload: `validateFile(file)`; if invalid, toast and skip.
- Uses `sanitizeFilename(file.name)` as the name sent to Blob upload.
- Uses admin upload URL: `handleUploadUrl: "/api/admin/uploads/auth"`.

### 3.2 `app/api/admin/uploads/auth/route.ts`

- Imports `ALLOWED_MIME_TYPES` and `MAX_FILE_SIZE` from `@/lib/security`.
- Session required (Better Auth); returns 401 if no session.
- Rate limit enforced via `getRateLimitKey` and `ratelimit`.
- `onBeforeGenerateToken`: passes `allowedContentTypes: ALLOWED_MIME_TYPES`, `maximumSizeInBytes: MAX_FILE_SIZE`, and tokenPayload (userId, email, role).
- So admin uploads use the same allowed types and 50MB limit as the rest of the security layer.

---

## 4. Publisher form page

### 4.1 `app/(publisher)/form/page.tsx`

- **Role:** Publisher form landing page.
- **Layout:** Centered column, min-height screen, gap-2; background from `getVariables().colors.background`.
- **Logo:** Image from `variables.logo.path`, alt from `variables.logo.alt`, responsive width (190px / 220px / 260px), object-contain.
- **Form:** Renders `PublisherForm` from `@/features/publisher/components/form/PublisherForm`.

---

## 5. Environment

### 5.1 `env.js` (T3 env schema)

- **Server vars:** DATABASE*URL, BETTER_AUTH*_, CORS*ALLOWED_ORIGINS, VERCEL_URL, ADMIN*_, ADVERTISER*\*, EVERFLOW*_, CRON*SECRET, ALERT_WEBHOOK_URL, BLOB_READ_WRITE_TOKEN, PYTHON_SERVICE_URL, GRAMMAR_AI_URL, TELEGRAM_BOT_TOKEN, UPSTASH_REDIS*_.
- **Client vars:** NEXT_PUBLIC_BETTER_AUTH_URL, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_BLOB_URL, NEXT_PUBLIC_TELEGRAM_BOT_URL.
- **Options:** skipValidation when SKIP_ENV_VALIDATION is set; emptyStringAsUndefined: true.
- All of the above are used across the app for DB, auth, blob, grammar, Telegram, Redis, etc.

---

## 6. Git and remote (operational)

- **Remote:** Kept as Big-Drops-MG/Assets-Exchange (origin URL correct).
- **Config:** user.name and user.email set as desired for commits (e.g. swapnaja-bigdrops, swapnaja@bigdropsmarketing.com).
- **Permission denied "Swapnaja27":** Caused by **GitHub authentication** (credentials), not git config. Windows was using the Swapnaja27 account for GitHub. **Fix:** Remove stored GitHub credential (e.g. Credential Manager or `cmdkey /delete:git:https://github.com`) and sign in with the account that has push access to the repo when Git prompts.

# 02-02-2026

---

## 1. Upload security (magic-byte validation and sanitization)

### 1.1 `lib/security/validateBuffer.ts`

**Purpose:** Validate uploads by actual buffer content (magic bytes) instead of client-reported MIME.

**Function:** `validateBufferMagicBytes(buffer: Buffer): Promise<ValidateResult>`

**ValidateResult type:**

- Success: `{ ok: true; detectedMime: string; detectedExt: string }`
- Failure: `{ ok: false; reason: string }`

**Logic (step-by-step):**

1. If buffer is empty or missing: return `{ ok: false, reason: "Empty file" }`.
2. If buffer length > MAX_FILE_SIZE (50MB): return `{ ok: false, reason: "File exceeds 50MB limit" }`.
3. Call `fileTypeFromBuffer(buffer)` (from `file-type` package).
4. If `file-type` returns nothing (e.g. for HTML): read first 4096 bytes as UTF-8, lowercase; if the string contains any of `<!doctype html`, `<html`, `<head`, `<body` and "text/html" is in ALLOWED_MIME_TYPES, return `{ ok: true, detectedMime: "text/html", detectedExt: "html" }`.
5. If still no detection: return `{ ok: false, reason: "Unknown or unsupported file type" }`.
6. If detected MIME is not in ALLOWED_MIME_TYPES: return `{ ok: false, reason: "Invalid file type: ${detected.mime}" }`.
7. Otherwise return `{ ok: true, detectedMime, detectedExt }`.

**Imports:** `file-type`, `ALLOWED_MIME_TYPES` and `MAX_FILE_SIZE` from `./route`.

---

### 1.2 `lib/security/route.ts`

**Exports:**

| Export                     | Type     | Description                                                                                                                   |
| -------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| ALLOWED_MIME_TYPES         | string[] | image/jpeg, image/png, image/gif, image/webp, text/html, application/zip, application/x-zip-compressed, video/mp4, video/webm |
| MAX_FILE_SIZE              | number   | 50 _ 1024 _ 1024 (50MB)                                                                                                       |
| sanitizeFilename(filename) | function | Replaces non-alphanumeric (except . and -) with `_`, collapses multiple dots to one, truncates to 100 chars                   |
| validateFile(file: File)   | function | Returns { valid: boolean, error?: string }; valid only if file.type in ALLOWED_MIME_TYPES and file.size <= MAX_FILE_SIZE      |

---

### 1.3 `lib/security/index.ts` (new file)

**Purpose:** Resolve build error "Module not found: Can't resolve '@/lib/security'" by providing a single entry point for the security folder.

**Contents (exact):**
export { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, sanitizeFilename, validateFile } from "./route";
export { validateBufferMagicBytes } from "./validateBuffer";

**Zod schema validation (Publisher API + generic middleware)**
Task: Replace manual body checks with Zod; add a generic middleware that validates every request to the Publisher API (e.g. campaign/name 5+ chars, email valid).

**2.1 Generic validation helper**
File: lib/middleware/validateRequest.ts (new)
Purpose: Reusable helper so any route can validate JSON body with a Zod schema and get typed data or a 400 response.
Imports: NextRequest, NextResponse from "next/server"; ZodSchema from "zod".
Signature:
export async function validateRequest<T>( req: NextRequest, schema: ZodSchema<T>): Promise<{ data: T } | { response: NextResponse }>
Behaviour:
Reads body with await req.json(); on throw returns 400 { error: "Invalid JSON body" }.
Runs schema.safeParse(body); on failure returns 400 with { error: "Invalid input", details: parsed.error.flatten(), fieldErrors: parsed.error.flatten().fieldErrors }.
On success returns { data: parsed.data }.
Usage: Handler must pass a NextRequest (not plain Request). After calling, check "response" in validation and return validation.response if present; otherwise use validation.data.

**2.2 Publisher API schemas**
File: lib/validations/publisher.ts (new)
Purpose: Central Zod schemas for the Publisher submit API. Implements: name/campaign 5+ chars, email valid.
Exports:
fileSchema: id, name, url, size, type, metadata (optional).
submitSchema:
affiliateId min 1 char
companyName min 5 chars (task requirement)
firstName, lastName min 1 char
email via .email()
telegramId optional
offerId, creativeType min 1 char
fromLines, subjectLines, additionalNotes, priority optional
files optional array of fileSchema
SubmitPayload: z.infer<typeof submitSchema>

**2.3 Publisher submit route**
File: app/api/submit/route.ts
Changes:
Removed inline submitSchema and fileSchema and manual safeParse/flatten handling.
Added imports: validateRequest from @/lib/middleware/validateRequest, submitSchema from @/lib/validations/publisher.
POST handler: const validation = await validateRequest(req, submitSchema); if "response" in validation return validation.response; else const data = validation.data and use data for the rest of the handler.
No manual if (!body.campaignName) or similar; validation is entirely via Zod and the generic helper.
Handler already used NextRequest for req.
Result: Publisher API (POST /api/submit) validates every request with Zod (companyName 5+ chars, email valid). 3. Admin brand-guidelines routes (Zod + validateRequest)
Task: Use the same generic Zod validation for admin brand-guidelines PUT bodies and fix type/request types.

**3.1 Advertiser brand-guidelines**
File: app/api/admin/advertisers/[id]/brand-guidelines/route.ts
Changes:
Import NextRequest from "next/server" (in addition to NextResponse).
Import validateRequest from @/lib/middleware/validateRequest and brandGuidelinesSchema from @/lib/validations/admin.
PUT handler first parameter: Request changed to NextRequest so req can be passed to validateRequest.
PUT body: replaced manual if (!body.type), if (body.type === "url" && !body.url), etc., with const validation = await validateRequest(req, brandGuidelinesSchema); if "response" in validation return validation.response; else const data = validation.data.
Service call: attachAdvertiserBrandGuidelines(id, { ...data, type: data.type ?? "text" }, session.user.id). Schema allows type nullable; service expects type: "url" | "file" | "text", so type is defaulted to "text" when null.

**3.2 Offer brand-guidelines**
File: app/api/admin/offers/[id]/brand-guidelines/route.ts
Changes:
Import NextRequest from "next/server".
Import validateRequest and brandGuidelinesSchema (same as above).
POST handler: first parameter typed as NextRequest (for consistency; POST body is still validated manually with if (!body.fileId)).
PUT handler: first parameter Request changed to NextRequest.
PUT body: const validation = await validateRequest(req, brandGuidelinesSchema); if "response" in validation return validation.response; else const data = validation.data.
Service call: attachOfferBrandGuidelines(id, { ...data, type: data.type ?? "text" }, session.user.id) so type is never null.
Note: POST in this file still uses manual if (!body.fileId) and does not use Zod for the POST body.

---

# 03-02-2026

### 1. Build / ESLint / TypeScript fixes

- **app/(publisher)/recent-activity/route.ts:** `import type` for NextRequest; import order; session ownership check using `(session.user as { publisherId?: string }).publisherId` and conditional for publisher-only data.
- **app/api/admin/creatives/reset-stuck-scanning/route.ts:** Import order (`@/lib/logger`, `@/lib/schema`); all `console.log` replaced with `logger.info`.
- **lib/services/creative-status.service.ts:** Blank line between `drizzle-orm` and `@/lib` import groups (import/order).
- **lib/services/grammar.service.ts:** `object-shorthand` fixes: `grammarFeedback: grammarFeedback` changed to `grammarFeedback`.
- **lib/validations/admin.ts:** `z.enum` usage updated for Zod 4: `errorMap` replaced with `message`.
- **app/api/admin/offers/[id]/brand-guidelines/route.ts** and **app/api/admin/advertisers/[id]/brand-guidelines/route.ts:** Handlers use `NextRequest`; `validateRequest`; brand-guidelines payload passed with `type: data.type ?? "text"` so service receives non-null type.

### 2. Verify grammar-feedback migration script

- **scripts/verify-grammar-feedback-migration.ts:**
  - Replaced `eq(externalTasks.grammarFeedback, null)` with `isNull(externalTasks.grammarFeedback)` and added `isNull` import from `drizzle-orm` (Drizzle does not accept `null` in `eq()` for this JSON column).
  - Added file-level `/* eslint-disable no-console */` so the CLI script can use `console.log` without violating `no-console` (hook runs at commit; script is intended to print to stdout).

### 3. My Recent Activity (publisher)

- **Endpoint:** `GET /recent-activity?publisherId=<id>` at `app/(publisher)/recent-activity/route.ts`.
- **Service:** `features/publisher/services/recentActivity.services.ts` – fetches last 10 activities by joining `creativeRequestHistory` and `creativeRequests` filtered by `publisherId`; returns human-readable messages (e.g. "Request X was Rejected").
- **Route:** Optional ownership check using session and `publisherId`; uses logger and typed session.

---

## Real-time upload progress bar

### 1. useFileUpload hook (`hooks/useFileUpload.ts`)

- **Exposes:** `uploadProgress` (0–100) in addition to `uploadFiles` and `isUploading`.
- **State:** `uploadProgress` state; reset to 0 at start of upload and in `finally`.
- **Progress updates:** `onUploadProgress` passed to Vercel Blob `upload()`; callback uses `event.percentage` and divides by `files.length` when uploading multiple files so aggregate progress stays 0–100.
- **Return:** `return { uploadFiles, isUploading, uploadProgress }` (fixed earlier typo where return used non-existent `progress`).

### 2. CreativeDetails (`features/publisher/components/form/_steps/CreativeDetails.tsx`)

- **State:** Added `uploadProgress` state (0–100).
- **Upload progress wiring:** All three `upload()` calls (single-file ZIP path, single-file non-ZIP path, multiple-file ZIP path) now pass `onUploadProgress: (e) => setUploadProgress(typeof e.percentage === "number" ? e.percentage : 0)` so progress reflects the actual Blob upload.
- **Reset:** `setUploadProgress(0)` in the `finally` block of both `handleSingleFileUpload` and `handleMultipleFileUpload`.
- **Modal:** Passes `uploadProgress={uploadProgress}` to `FileUploadModal`.

### 3. FileUploadModal (`features/publisher/components/form/_modals/FileUploadModal.tsx`)

- **Removed:** Module-level `useFileUpload()` call (invalid React hook usage; hooks must run inside a component). Removed `useFileUpload` import.
- **New prop:** `uploadProgress?: number` (default 0), supplied by parent (CreativeDetails) so the bar reflects the upload that the parent performs when the user selects a file.
- **UI when uploading:** When `uploadStatus === "uploading"`, shows Shadcn `<Progress value={uploadProgress} />` and text "Uploading… {Math.round(uploadProgress)}%" in addition to the existing spinner and helper text.
- **Import:** `Progress` from `@/components/ui/progress`.

### 4. Task completion summary

- **useFileUpload:** Exposes `uploadProgress` (0–100) for consumers (e.g. admin flows).
- **FileUploadModal:** Progress bar and percentage are driven by the parent’s `uploadProgress` prop, which is updated by CreativeDetails’ `onUploadProgress` during the modal-triggered upload (single or 50MB ZIP).
- **Shadcn Progress:** Used with `value={uploadProgress}`; no changes to `components/ui/progress.tsx`.

---

## Creative "Gallery View" Toggle

**Task:** Add a List vs Grid toggle on the Creatives page. List mode keeps the current table; Grid mode shows a responsive grid of creative cards with thumbnail, status badge, and campaign name.

**Where it appears:** Dashboard Creatives page (`/creatives` or `/dashboard/creatives`). Visible only when logged in as **admin** (page uses `ManageCreativesPage` for admin role only).

### 1. CreativeCard component (`features/publisher/components/CreativeCard.tsx`)

- **New file.** Card used in Grid mode.
- **Props:** `request` (CreativeRequest), optional `thumbnailUrl`, optional `onViewClick(requestId)`.
- **UI:** Thumbnail area (image if `thumbnailUrl` provided, otherwise placeholder icon), status badge (approved = green, rejected = red), campaign name (offerName), advertiser name, "View Creative" button that calls `onViewClick(request.id)`.
- **Styling:** Uses existing Card, Button, and `getVariables()` for theme.

### 2. ManageCreativesPage (`features/admin/components/ManageCreativesPage.tsx`)

- **Toggle:** List / Grid buttons (LayoutList and LayoutGrid icons) added in the toolbar between the Filter popover and the Approved/Rejected tabs. Default is List.
- **State:** `viewMode` ("list" | "grid"), `viewData` (RequestViewData | null), `isViewModalOpen`, `isViewLoading` for opening creative view from grid.
- **List mode:** Unchanged; renders `RequestSection` with `paginatedRequests` (accordion table, View Creative, Download).
- **Grid mode:** Renders a responsive CSS grid (`grid-cols-2` up to `xl:grid-cols-6`) of `CreativeCard` for `paginatedRequests`. Same filters, tabs, search, and pagination apply.
- **View from grid:** "View Creative" on a card calls `getRequestViewData(requestId)` (server action); on success opens `SingleCreativeViewModal` (single creative) or `MultipleCreativesModal` (multiple creatives). Same modals as in list view.
- **Imports added:** LayoutList, LayoutGrid, getRequestViewData, RequestViewData from request.actions, SingleCreativeViewModal, MultipleCreativesModal from publisher, CreativeCard from publisher, toast from sonner.

### 3. Thumbnails in grid

- List API does not return creative image URLs. Cards show a placeholder in the thumbnail area. To show real thumbnails later, the API can be extended to include a thumbnail URL (e.g. first creative URL) per request and pass it to `CreativeCard` as `thumbnailUrl`.

---

## Date Range Picker for Charts

**Task:** Add a Shadcn/UI Date Range Picker above the Admin Performance Chart. Pass selected `startDate` and `endDate` as query parameters to the dashboard performance API. Chart re-fetches when the date range changes.

**Where it appears:** Admin Dashboard. Date picker is shown above the performance chart (when not loading). Chart data is filtered to the selected range when both from and to are set; "All Time" when no range is selected.

### 1. AdminDashboard (`features/admin/components/AdminDashboard.tsx`)

- **State:** `range` (`DateRange | undefined`) for the picker; `undefined` = "All Time".
- **Label:** `rangeLabel` memo: "All Time", single date (from only), or "MMM dd, yyyy - MMM dd, yyyy" when both from and to are set.
- **UI:** Popover with trigger Button (CalendarIcon + rangeLabel). PopoverContent contains Shadcn `Calendar` with `mode="range"`, `numberOfMonths={2}`, `selected={range}`, `onSelect={setRange}`. Clear button (X) when a range is set, calls `setRange(undefined)`.
- **Chart:** `AdminPerformanceChart` receives `dateRange={range}` so the chart refetches when range changes. Removed invalid `initialFocus` prop from Calendar (not a valid react-day-picker prop).

### 2. AdminPerformanceChart (`features/admin/components/AdminPerformanceChart.tsx`)

- **Props:** `dateRange?: DateRange` passed from AdminDashboard.
- **ViewModel:** Calls `usePerformanceChartViewModel(comparisonType, selectedMetric, dateRange)` so the view model can send startDate/endDate to the API when both are set.

### 3. usePerformanceChartViewModel (`features/admin/view-models/usePerformanceChartViewModel.ts`)

- **Params:** Accepts optional `dateRange` (DateRange). When both `dateRange.from` and `dateRange.to` exist, derives `startDate` and `endDate` as YYYY-MM-DD strings via `toYMD()`.
- **Fetch:** Calls `getPerformanceChartData(comparisonType, metric, { startDate, endDate })`. `useEffect` dependency array includes `startDate`, `endDate` so the chart refetches when the date range changes.

### 4. performance.client.ts (`features/admin/services/performance.client.ts`)

- **API:** `getPerformanceChartData(comparisonType, metric, dateFilter?)`. Builds URLSearchParams with `comparisonType` and `metric`. When `dateFilter?.startDate` and `dateFilter?.endDate` are both set, appends them to the query string. Fetches `/api/admin/dashboard/performance?…`. Returns `result.data` (chart data object).

### 5. API route (`app/api/admin/dashboard/performance/route.ts`)

- **Query params:** Reads `startDate` and `endDate` from `searchParams` (optional). Builds `input` object with `comparisonType`, `metric`, and when present `startDate`, `endDate`.
- **RPC:** Passes full `input` to the dashboard performance RPC handler so the backend can filter by date range.

### 6. RPC handler (`lib/rpc/router.ts`)

- **Input schema:** Added optional `startDate: z.string().optional()` and `endDate: z.string().optional()` to the dashboard performance procedure input.
- **Imports:** Added `gte`, `lte` from `drizzle-orm`.
- **Logic:** When both `startDate` and `endDate` are provided, builds `dateRangeWhere = and(gte(dateField, start), lte(dateField, end))` with start at 00:00:00.000Z and end at 23:59:59.999Z. Combines with existing metric where clause into `fullWhere`. All three performance queries (Today vs Yesterday/Last Week, Current Week vs Last Week, Current Month vs Last Month) use `.where(fullWhere)` instead of only `metricWhereClause`, so chart data is restricted to the selected date range when the user picks one.

### 7. components/ui/calendar.tsx

- No code changes. Existing Calendar supports `mode="range"`, `selected`, `onSelect`; used as-is from Shadcn/UI.
