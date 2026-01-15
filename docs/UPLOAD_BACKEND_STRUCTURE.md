# Upload Backend Code Structure Documentation

## Overview

This document provides a comprehensive analysis of the upload backend code structure for the Assets-Exchange platform. It covers all upload-related functionality including creative files, brand guidelines, ZIP archives, and their associated backend implementations.

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [API Endpoints Required](#api-endpoints-required)
3. [Storage Architecture](#storage-architecture)
4. [Database Schema](#database-schema)
5. [File Upload Flow](#file-upload-flow)
6. [Implementation Structure](#implementation-structure)
7. [Security, Lifecycle & Operational Guarantees](#security-lifecycle--operational-guarantees)
8. [Best Practices & Recommendations](#best-practices--recommendations)
9. [Environment Variables](#environment-variables)
10. [Migration Checklist](#migration-checklist)
11. [References](#references)

---

## Current State Analysis

### Frontend Expectations

The frontend currently expects the following upload endpoints:

#### 1. Single File Upload
- **Endpoint**: `POST /api/upload`
- **Content-Type**: `multipart/form-data`
- **Request Body**:
  ```typescript
  {
    file: File,
    smartDetection?: "true" // For ZIP files
  }
  ```
- **Expected Response**:
  ```typescript
  {
    file: {
      fileId: string,
      fileName: string,
      fileUrl: string,
      fileSize: number,
      fileType: string,
      previewUrl?: string
    },
    zipAnalysis?: {
      isSingleCreative: boolean,
      mainCreative?: {
        fileId: string,
        fileName: string,
        fileUrl: string,
        fileSize: number,
        fileType: string,
        previewUrl?: string
      },
      assetCount: number
    }
  }
  ```

#### 2. ZIP File Upload
- **Endpoint**: `POST /api/upload-zip`
- **Content-Type**: `multipart/form-data`
- **Request Body**:
  ```typescript
  {
    file: File // ZIP archive
  }
  ```
- **Expected Response**:
  ```typescript
  {
    extractedFiles: Array<{
      fileId: string,
      fileName: string,
      fileUrl: string,
      fileSize: number,
      fileType: string,
      previewUrl?: string
    }>
  }
  ```

#### 3. Brand Guidelines Upload
- **Endpoint**: `PUT /api/admin/{entityType}s/:id/brand-guidelines`
- **Entity Types**: `offers`, `advertisers`, `publishers`
- **Content-Type**: `multipart/form-data` (for files) or `application/json` (for URL/text)
- **Request Body** (File):
  ```typescript
  {
    type: "file",
    file: File,
    notes?: string
  }
  ```
- **Request Body** (URL):
  ```typescript
  {
    type: "url",
    url: string,
    notes?: string
  }
  ```
- **Request Body** (Text):
  ```typescript
  {
    type: "text",
    text: string,
    notes?: string
  }
  ```

### File Type Requirements

#### Creative Files
- **Allowed Types**: `.html`, `.htm`, `.zip`, `.png`, `.jpg`, `.jpeg`
- **Max Size**: 50MB (single), 100MB (ZIP)
- **Location**: `features/publisher/components/form/_steps/CreativeDetails.tsx`

#### Brand Guidelines
- **Allowed Types**: `.doc`, `.docx`, `.pdf`
- **Max Size**: 10MB
- **Location**: `features/admin/components/BrandGuidelinesModal.tsx`

---

## API Endpoints Required

### 1. Creative File Upload

#### `POST /api/upload`

**Purpose**: Upload single creative files (HTML, images) or ZIP files with smart detection

**Implementation Location**: `app/api/upload/route.ts`

**Request**:
```typescript
FormData {
  file: File,
  smartDetection?: "true"
}
```

**Response**:
```typescript
{
  file: {
    fileId: string,
    fileName: string,
    fileUrl: string,
    fileSize: number,
    fileType: string,
    previewUrl?: string
  },
  zipAnalysis?: {
    isSingleCreative: boolean,
    mainCreative?: FileMetadata,
    assetCount: number
  }
}
```

**Error Responses**:
- `400`: Invalid file type or size
- `401`: Unauthorized
- `413`: File too large
- `500`: Server error

**Implementation Notes**:
- Validate file type and size
- Generate unique file ID
- Upload to storage provider
- For ZIP files, analyze contents if `smartDetection` is true
- Generate preview URLs for images
- Return file metadata

---

#### `POST /api/upload-zip`

**Purpose**: Upload and extract ZIP archives containing multiple creatives

**Implementation Location**: `app/api/upload-zip/route.ts`

**Request**:
```typescript
FormData {
  file: File // ZIP archive
}
```

**Response**:
```typescript
{
  extractedFiles: Array<{
    fileId: string,
    fileName: string,
    fileUrl: string,
    fileSize: number,
    fileType: string,
    previewUrl?: string
  }>
}
```

**Error Responses**:
- `400`: Invalid ZIP file or corrupted archive
- `401`: Unauthorized
- `413`: File too large
- `500`: Server error

**Implementation Notes**:
- Validate ZIP file format
- Extract all files from archive
- Upload each extracted file to storage
- Filter out non-creative files (only HTML, images)
- Generate previews for images
- Return array of file metadata

---

### 2. Brand Guidelines Upload

#### `PUT /api/admin/{entityType}s/:id/brand-guidelines`

**Purpose**: Upload or update brand guidelines for offers, advertisers, or publishers

**Implementation Location**: `app/api/admin/{entityType}s/[id]/brand-guidelines/route.ts`

**Path Parameters**:
- `entityType`: `"offers" | "advertisers" | "publishers"`
- `id`: Entity ID

**Request** (File Upload):
```typescript
FormData {
  type: "file",
  file: File,
  notes?: string
}
```

**Request** (URL):
```typescript
{
  type: "url",
  url: string,
  notes?: string
}
```

**Request** (Text):
```typescript
{
  type: "text",
  text: string,
  notes?: string
}
```

**Response**:
```typescript
{
  type: "url" | "file" | "text",
  url?: string,
  fileUrl?: string,
  fileName?: string,
  fileSize?: number,
  mimeType?: string,
  text?: string,
  notes?: string,
  updatedAt: string
}
```

**Error Responses**:
- `400`: Validation errors (invalid URL, file type/size)
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Entity not found
- `413`: File too large
- `500`: Server error

**Implementation Notes**:
- Validate entity exists
- For file uploads: validate type (.doc, .docx, .pdf) and size (max 10MB)
- For URL: validate HTTPS URL format
- For text: sanitize HTML content
- If replacing existing file, delete old file from storage
- Update database with new brand guidelines metadata
- Log update in audit trail

---

### 3. File Management

#### `GET /api/admin/files/:id`

**Purpose**: Get file metadata

**Implementation Location**: `app/api/admin/files/[id]/route.ts`

**Response**:
```typescript
{
  id: string,
  originalName: string,
  storedName: string,
  mimeType: string,
  size: number,
  url: string,
  uploadedBy: string,
  createdAt: string,
  entityReferences: Array<{
    entityType: string,
    entityId: string
  }>
}
```

---

#### `DELETE /api/admin/files/:id`

**Purpose**: Delete a file from storage and database

**Implementation Location**: `app/api/admin/files/[id]/route.ts`

**Response**:
```typescript
{
  success: boolean,
  message: string
}
```

**Implementation Notes**:
- Check if file is referenced by any entities
- Delete from storage provider
- Remove from database
- Log deletion in audit trail

---

## Storage Architecture

### Storage Provider Abstraction

**Location**: `lib/storage.ts` or `lib/blob-storage.ts`

**Purpose**: Abstract storage operations to support multiple providers (Vercel Blob, AWS S3, Cloudflare R2)

**Interface**:
```typescript
interface StorageProvider {
  upload(file: File, path: string): Promise<{
    url: string,
    key: string
  }>;
  
  delete(key: string): Promise<void>;
  
  getUrl(key: string): Promise<string>;
  
  generatePresignedUrl(key: string, expiresIn?: number): Promise<string>;
}
```

**Supported Providers**:
1. **Vercel Blob** (Development/Testing)
2. **AWS S3** (Production)
3. **Cloudflare R2** (Alternative)

**Configuration**:
```typescript
// Environment variables
BLOB_STORAGE_PROVIDER: "vercel" | "s3" | "r2"
BLOB_READ_WRITE_TOKEN: string // Required for Vercel Blob - Get from Vercel Dashboard → Storage → Blob
AWS_S3_BUCKET_NAME?: string
AWS_S3_REGION?: string
AWS_ACCESS_KEY_ID?: string
AWS_SECRET_ACCESS_KEY?: string
R2_ACCOUNT_ID?: string
R2_ACCESS_KEY_ID?: string
R2_SECRET_ACCESS_KEY?: string
R2_BUCKET_NAME?: string
```

**Vercel Blob Setup**:
1. Install package: `pnpm add @vercel/blob`
2. Get token from Vercel Dashboard → Storage → Blob → Create Store → Copy token
3. Add `BLOB_READ_WRITE_TOKEN` to `.env`
4. Use `put()`, `del()`, `head()` from `@vercel/blob` package

**Implementation Structure**:
```typescript
// lib/storage.ts
export class StorageService {
  private provider: StorageProvider;
  
  constructor() {
    const providerType = process.env.BLOB_STORAGE_PROVIDER || "vercel";
    this.provider = this.createProvider(providerType);
  }
  
  private createProvider(type: string): StorageProvider {
    switch (type) {
      case "vercel":
        return new VercelBlobProvider();
      case "s3":
        return new S3Provider();
      case "r2":
        return new R2Provider();
      default:
        throw new Error(`Unsupported storage provider: ${type}`);
    }
  }
  
  async uploadFile(file: File, options?: UploadOptions): Promise<FileMetadata> {
    // Implementation
  }
  
  async deleteFile(key: string): Promise<void> {
    // Implementation
  }
  
  async getFileUrl(key: string): Promise<string> {
    // Implementation
  }
}
```

---

## Database Schema

### File Uploads Table

**Location**: `lib/schema.ts`

**Schema**:
```typescript
export const fileUploadStatusEnum = pgEnum("file_status", [
  "pending_scan",
  "clean",
  "infected",
  "deleted",
]);

export const fileUploads = pgTable(
  "file_uploads",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    originalName: text("original_name").notNull(),
    storedName: text("stored_name").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    url: text("url").notNull(),
    storageKey: text("storage_key").notNull(),
    storageProvider: text("storage_provider").notNull(), // "vercel" | "s3" | "r2"
    uploadedBy: text("uploaded_by").notNull().references(() => users.id),
    entityType: text("entity_type"), // "creative_request" | "offer" | "advertiser" | "publisher" | "creative"
    entityId: text("entity_id"), // References creative_requests.id, offers.id, advertisers.id, publishers.id, etc.
    status: fileUploadStatusEnum("status").notNull().default("pending_scan"),
    scannedAt: timestamp("scanned_at"),
    scanResult: jsonb("scan_result"), // { result: "clean" | "infected", scanner: string, details: object }
    deletedAt: timestamp("deleted_at"), // Soft delete timestamp
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uploadedByIdx: index("idx_file_uploads_uploaded_by").on(table.uploadedBy),
    entityIdx: index("idx_file_uploads_entity").on(table.entityType, table.entityId),
    statusIdx: index("idx_file_uploads_status").on(table.status),
    createdAtIdx: index("idx_file_uploads_created_at").on(table.createdAt),
    deletedAtIdx: index("idx_file_uploads_deleted_at").on(table.deletedAt),
  })
);
```

**Important Notes**:
- **Publisher Form Uploads**: Files uploaded via publisher form should link to `creative_requests` table
  - `entityType`: `"creative_request"`
  - `entityId`: The `creative_requests.id` (when the creative request is created/submitted)
- **Publisher Table**: Publisher data is stored in a separate `publishers` table (see Phase 10.6.1 in backend plan)
  - Publisher-specific files can link to `publishers` table when needed
  - `entityType`: `"publisher"`
  - `entityId`: The `publishers.id`

**Migration SQL**:
```sql
CREATE TYPE file_status AS ENUM ('pending_scan', 'clean', 'infected', 'deleted');

CREATE TABLE IF NOT EXISTS "file_uploads" (
  "id" text PRIMARY KEY NOT NULL,
  "original_name" text NOT NULL,
  "stored_name" text NOT NULL,
  "mime_type" text NOT NULL,
  "size" integer NOT NULL,
  "url" text NOT NULL,
  "storage_key" text NOT NULL,
  "storage_provider" text NOT NULL,
  "uploaded_by" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "entity_type" text, -- "creative_request" | "offer" | "advertiser" | "publisher" | "creative"
  "entity_id" text, -- References creative_requests.id, offers.id, advertisers.id, publishers.id, etc.
  "status" file_status NOT NULL DEFAULT 'pending_scan',
  "scanned_at" timestamp,
  "scan_result" jsonb,
  "deleted_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_file_uploads_uploaded_by" 
ON "file_uploads" ("uploaded_by");

CREATE INDEX IF NOT EXISTS "idx_file_uploads_entity" 
ON "file_uploads" ("entity_type", "entity_id");

CREATE INDEX IF NOT EXISTS "idx_file_uploads_status" 
ON "file_uploads" ("status");

CREATE INDEX IF NOT EXISTS "idx_file_uploads_created_at" 
ON "file_uploads" ("created_at");

CREATE INDEX IF NOT EXISTS "idx_file_uploads_deleted_at" 
ON "file_uploads" ("deleted_at");
```

**Entity Type Reference**:
- `"creative_request"`: Files linked to `creative_requests` table (publisher form submissions)
- `"offer"`: Files linked to `offers` table (brand guidelines, etc.)
- `"advertiser"`: Files linked to `advertisers` table (brand guidelines, etc.)
- `"publisher"`: Files linked to `publishers` table (publisher-specific files)
- `"creative"`: Standalone creative files (not yet linked to a request)

### Brand Guidelines Table (Optional Enhancement)

**Schema**:
```typescript
export const brandGuidelines = pgTable(
  "brand_guidelines",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    entityType: text("entity_type").notNull(), // "offer" | "advertiser" | "publisher"
    entityId: text("entity_id").notNull(),
    type: text("type").notNull(), // "url" | "file" | "text"
    url: text("url"),
    fileId: text("file_id").references(() => fileUploads.id, { onDelete: "set null" }),
    text: text("text"),
    notes: text("notes"),
    updatedBy: text("updated_by").notNull().references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    entityIdx: index("idx_brand_guidelines_entity").on(table.entityType, table.entityId),
    fileIdIdx: index("idx_brand_guidelines_file_id").on(table.fileId),
  })
);
```

---

## File Upload Flow

### File Safety & Lifecycle (Mandatory System Behavior)

**All file uploads MUST follow this lifecycle:**

1. **Upload**: File is uploaded → stored → `status = "pending_scan"` (MANDATORY)
2. **Scan Job**: Background malware scan job is enqueued (MANDATORY)
3. **Scanning**: Scanner processes file and updates status:
   - `status = "clean"` → File is safe and usable
   - `status = "infected"` → File is quarantined, alerts triggered
4. **Usage**: Only files with `status = "clean"` are usable/attachable (MANDATORY)
5. **Deletion**: All deletions use soft delete (`deleted_at` timestamp) (MANDATORY)

**System Rules:**
- Files in `pending_scan` MUST NOT be attachable or visible to end users
- Files in `infected` MUST NEVER be exposed via public URLs
- Only `clean` files MAY be attached to entities (creatives, offers, guidelines)
- All delete operations MUST set `deleted_at`, never hard-delete by default
- Scan failures MUST default to `pending_scan` (retryable), NEVER `clean`

### Single File Upload Flow

```
1. Frontend: User selects file
   ↓
2. Frontend: Validate file (type, size)
   ↓
3. Frontend: Create FormData, append file
   ↓
4. Frontend: POST /api/upload
   ↓
5. Backend: Validate request (auth, file, rate limit)
   ↓
6. Backend: Generate unique file ID
   ↓
7. Backend: Sanitize filename
   ↓
8. Backend: Upload to storage provider
   ↓
9. Backend: Save metadata to database with status = "pending_scan"
   ↓
10. Backend: Enqueue malware scan background job (MANDATORY)
    ↓
11. Backend: Return file metadata (status: "pending_scan")
    ↓
12. Frontend: Update UI (file is pending scan, not yet usable)
    ↓
13. Background Job: Scan file
    ↓
14. Background Job: Update status to "clean" or "infected"
    ↓
15. Background Job: If infected, trigger admin alerts
    ↓
16. Frontend: Poll or receive notification when status = "clean"
    ↓
17. Frontend: File becomes usable/attachable
```

### ZIP File Upload Flow

```
1. Frontend: User selects ZIP file
   ↓
2. Frontend: Validate ZIP file
   ↓
3. Frontend: POST /api/upload-zip
   ↓
4. Backend: Validate ZIP file
   ↓
5. Backend: Extract ZIP contents
   ↓
6. Backend: Filter creative files (HTML, images)
   ↓
7. Backend: For each file:
   - Upload to storage
   - Generate preview (if image)
   - Save metadata with status = "pending_scan"
   - Enqueue malware scan background job (MANDATORY)
   ↓
8. Backend: Return array of file metadata (all status: "pending_scan")
   ↓
9. Frontend: Display extracted files (pending scan, not yet usable)
   ↓
10. Background Jobs: Scan each file
    ↓
11. Background Jobs: Update each file status to "clean" or "infected"
    ↓
12. Frontend: Poll or receive notifications when files become "clean"
    ↓
13. Frontend: Files become usable/attachable
```

### Brand Guidelines Upload Flow

```
1. Frontend: User selects upload type (file/url/text)
   ↓
2. Frontend: If file, validate (.doc, .docx, .pdf, max 10MB)
   ↓
3. Frontend: PUT /api/admin/{entityType}s/:id/brand-guidelines
   ↓
4. Backend: Validate entity exists
   ↓
5. Backend: If file:
   - Upload to storage
   - Save file metadata with status = "pending_scan"
   - Enqueue malware scan background job (MANDATORY)
   - Soft-delete old file (if replacing) - set deleted_at
   ↓
6. Backend: If URL:
   - Validate HTTPS URL
   ↓
7. Backend: If text:
   - Sanitize HTML
   ↓
8. Backend: Update brand guidelines in database
   ↓
9. Backend: Log update in audit trail
   ↓
10. Backend: Return updated brand guidelines (file status: "pending_scan" if file)
    ↓
11. Frontend: Update UI (file pending scan if applicable)
    ↓
12. Background Job: Scan file (if file upload)
    ↓
13. Background Job: Update status to "clean" or "infected"
    ↓
14. Frontend: File becomes usable when status = "clean"
```

---

## Implementation Structure

### Directory Structure

```
app/
  api/
    upload/
      route.ts                    # Single file upload
    upload-zip/
      route.ts                    # ZIP file upload
    admin/
      files/
        [id]/
          route.ts                # GET/DELETE file
        upload/
          route.ts                # Admin file upload
      offers/
        [id]/
          brand-guidelines/
            route.ts              # Brand guidelines for offers
      advertisers/
        [id]/
          brand-guidelines/
            route.ts              # Brand guidelines for advertisers
      publishers/
        [id]/
          brand-guidelines/
            route.ts              # Brand guidelines for publishers

lib/
  storage.ts                      # Storage abstraction layer
  storage/
    providers/
      vercel-blob.ts             # Vercel Blob implementation
      s3.ts                      # AWS S3 implementation
      r2.ts                      # Cloudflare R2 implementation
    utils/
      file-validation.ts          # File validation utilities
      filename-sanitizer.ts      # Filename sanitization
      zip-extractor.ts           # ZIP extraction utilities
      preview-generator.ts       # Preview generation

lib/
  services/
    file-upload.service.ts        # File upload business logic
    brand-guidelines.service.ts   # Brand guidelines business logic

lib/
  schema.ts                       # Database schema (file_uploads, brand_guidelines)
```

### Key Files to Create

#### 1. `lib/storage/providers/base.ts` - Base Provider Interface

```typescript
export interface StorageProvider {
  upload(file: File, path: string, options?: UploadOptions): Promise<{
    url: string,
    key: string
  }>;
  
  delete(key: string): Promise<void>;
  
  getUrl(key: string): Promise<string>;
}

export interface UploadOptions {
  contentType?: string;
  access?: "public" | "private";
  addRandomSuffix?: boolean;
}
```

#### 2. `lib/storage/providers/vercel-blob.ts` - Vercel Blob Implementation

```typescript
import { put, del, head } from "@vercel/blob";
import type { StorageProvider, UploadOptions } from "./base";

export class VercelBlobProvider implements StorageProvider {
  private token: string;

  constructor() {
    this.token = process.env.BLOB_READ_WRITE_TOKEN || "";
    if (!this.token) {
      throw new Error("BLOB_READ_WRITE_TOKEN is required for Vercel Blob");
    }
  }

  async upload(
    file: File,
    path: string,
    options?: UploadOptions
  ): Promise<{ url: string; key: string }> {
    const fileBuffer = await file.arrayBuffer();
    const blob = new Blob([fileBuffer], { type: options?.contentType || file.type });

    const { url } = await put(path, blob, {
      access: options?.access || "public",
      token: this.token,
      addRandomSuffix: options?.addRandomSuffix ?? true,
      contentType: options?.contentType || file.type,
    });

    return {
      url,
      key: path,
    };
  }

  async delete(key: string): Promise<void> {
    await del(key, { token: this.token });
  }

  async getUrl(key: string): Promise<string> {
    const blob = await head(key, { token: this.token });
    return blob.url;
  }
}
```

#### 3. `lib/storage.ts` - Storage Service

```typescript
import { StorageProvider } from "./storage/providers/base";
import { VercelBlobProvider } from "./storage/providers/vercel-blob";
import { S3Provider } from "./storage/providers/s3";
import { R2Provider } from "./storage/providers/r2";

export interface UploadOptions {
  path?: string;
  public?: boolean;
  contentType?: string;
}

export interface FileMetadata {
  fileId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  storageKey: string;
  previewUrl?: string;
}

export class StorageService {
  private provider: StorageProvider;
  
  constructor() {
    const providerType = process.env.BLOB_STORAGE_PROVIDER || "vercel";
    this.provider = this.createProvider(providerType);
  }
  
  private createProvider(type: string): StorageProvider {
    switch (type) {
      case "vercel":
        return new VercelBlobProvider();
      case "s3":
        return new S3Provider();
      case "r2":
        return new R2Provider();
      default:
        throw new Error(`Unsupported storage provider: ${type}`);
    }
  }
  
  async uploadFile(
    file: File,
    options?: UploadOptions
  ): Promise<FileMetadata> {
    // Implementation
  }
  
  async deleteFile(key: string): Promise<void> {
    // Implementation
  }
  
  async getFileUrl(key: string): Promise<string> {
    // Implementation
  }
}

export const storageService = new StorageService();
```

#### 4. `app/api/upload/route.ts` - Single File Upload

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { storageService } from "@/lib/storage";
import { validateFile } from "@/lib/storage/utils/file-validation";
import { sanitizeFilename } from "@/lib/storage/utils/filename-sanitizer";
import { analyzeZip } from "@/lib/storage/utils/zip-extractor";
import { db } from "@/lib/db";
import { fileUploads } from "@/lib/schema";
import { createId } from "@paralleldrive/cuid2";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const smartDetection = formData.get("smartDetection") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const validation = validateFile(file, {
      allowedTypes: [".html", ".htm", ".zip", ".png", ".jpg", ".jpeg"],
      maxSize: 50 * 1024 * 1024, // 50MB
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const fileId = createId();
    const sanitizedName = sanitizeFilename(file.name);
    const storagePath = `uploads/${session.user.id}/${fileId}/${sanitizedName}`;

    const uploaded = await storageService.uploadFile(file, {
      path: storagePath,
      public: true,
      contentType: file.type,
    });

    const isZip = file.type === "application/zip" || file.name.toLowerCase().endsWith(".zip");
    
    let zipAnalysis = undefined;
    if (isZip && smartDetection) {
      zipAnalysis = await analyzeZip(file);
    }

    await db.insert(fileUploads).values({
      id: fileId,
      originalName: file.name,
      storedName: sanitizedName,
      mimeType: file.type,
      size: file.size,
      url: uploaded.fileUrl,
      storageKey: uploaded.storageKey,
      storageProvider: process.env.BLOB_STORAGE_PROVIDER || "vercel",
      uploadedBy: session.user.id,
      entityType: "creative",
      status: "pending_scan", // File must be scanned before use
    });

    // Enqueue malware scan job
    await enqueueFileScanJob(fileId);

    return NextResponse.json({
      file: {
        fileId: uploaded.fileId,
        fileName: uploaded.fileName,
        fileUrl: uploaded.fileUrl,
        fileSize: uploaded.fileSize,
        fileType: uploaded.fileType,
        previewUrl: uploaded.previewUrl,
      },
      ...(zipAnalysis && { zipAnalysis }),
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}
```

#### 3. `lib/storage/utils/file-validation.ts` - File Validation

```typescript
export interface ValidationOptions {
  allowedTypes: string[];
  maxSize: number;
  allowedMimeTypes?: string[];
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(
  file: File,
  options: ValidationOptions
): ValidationResult {
  if (file.size > options.maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum of ${options.maxSize / 1024 / 1024}MB`,
    };
  }

  const fileName = file.name.toLowerCase();
  const fileExtension = "." + fileName.split(".").pop()?.toLowerCase();

  const isValidExtension = options.allowedTypes.some((ext) =>
    fileName.endsWith(ext.toLowerCase())
  );

  if (!isValidExtension) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${options.allowedTypes.join(", ")}`,
    };
  }

  if (options.allowedMimeTypes && !options.allowedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: `MIME type not allowed: ${file.type}`,
    };
  }

  return { valid: true };
}
```

---

## Security, Lifecycle & Operational Guarantees

> **TL;DR**: The upload system is a secure, auditable ingestion pipeline with strict lifecycle management. Files are never immediately trusted, never hard-deleted by default, and never become part of the business workflow unless they pass validation and scanning.

### 1. File Lifecycle & Status Tracking

All uploaded files must follow a defined lifecycle to ensure safety and traceability.

#### File Statuses

Each uploaded file must have a status field:

- **`pending_scan`** — File uploaded, not yet scanned (or scan failed/retrying)
- **`clean`** — File passed malware scan and is safe to use
- **`infected`** — Malware detected, file quarantined and unusable
- **`deleted`** — Soft deleted and no longer active

**Note**: Scan failures remain in `pending_scan` status and are retried via background jobs. There is no separate "failed" status - failed scans are retryable and remain `pending_scan` until successful or manually intervened.

#### Required Fields

Add the following metadata to file records:

- `status` — File status enum (pending_scan, clean, infected, deleted)
- `scanned_at` — Timestamp (nullable) — When the file was scanned
- `scan_result` — JSON or text (nullable) — Scan results and details
- `deleted_at` — Timestamp (nullable) — Soft delete timestamp

#### Behavior

- Files in `pending_scan` must **not** be attachable or visible to end users
- Files in `infected` must:
  - Never be exposed via public URLs
  - Trigger alerts to admins
  - Be automatically soft-deleted or quarantined
- Only `clean` files may be attached to entities (creatives, offers, guidelines)

### 2. Malware Scanning

All uploaded files must be scanned for malware before being usable.

#### Flow

1. File is uploaded → stored → `status = pending_scan`
2. Malware scan job is enqueued asynchronously
3. Scanner updates status to `clean` or `infected`
4. UI and business logic respect file status

#### Requirements

- Scanning must be **asynchronous** (background job)
- Failure or timeout in scanning must default to `pending_scan` (retryable), **not** `clean`
- Scan failures must be retried according to retry policy
- Failed scans remain in `pending_scan` status (no separate "failed" status)
- After max retries, file stays in `pending_scan` until manual intervention
- Infected files must trigger:
  - Admin alert
  - Security log entry
  - Optional automatic soft deletion

#### Implementation

- Use background job system (similar to Everflow sync jobs)
- Enqueue scan job after file upload completes
- Scanner service updates file status and scan_result
- Retry failed scans with exponential backoff
- Failed scans remain in `pending_scan` status (no separate "failed" status)
- After max retries, file stays in `pending_scan` until manual intervention

### 3. MIME Type Validation & Sniffing

File validation must not rely solely on file extensions.

#### Requirements

- Perform MIME sniffing using file headers / magic bytes
- Validate both:
  - File extension
  - Detected MIME type
- Reject uploads where detected MIME does not match allowed types

#### Example MIME Type Mapping

| Extension | Allowed MIME Types |
|-----------|-------------------|
| `.pdf` | `application/pdf` |
| `.doc` | `application/msword` |
| `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| `.html` | `text/html`, `application/xhtml+xml` |
| `.htm` | `text/html`, `application/xhtml+xml` |
| `.png` | `image/png` |
| `.jpg` | `image/jpeg` |
| `.jpeg` | `image/jpeg` |
| `.zip` | `application/zip`, `application/x-zip-compressed` |

#### Implementation

- Use library like `file-type` or `mmmagic` for MIME detection
- Compare detected MIME with file extension
- Reject if mismatch (unless explicitly allowed)
- Log MIME mismatches for security monitoring

### 4. Rate Limiting

Upload endpoints must be protected against abuse.

#### Apply Rate Limits On

- **Per-user basis** — Limit uploads per authenticated user
- **Per-entity basis** — Limit uploads per offer, advertiser, publisher
- **Per-IP** — For public or unauthenticated endpoints

#### Example Limits

| Scope | Limit |
|-------|-------|
| Per user | 20 uploads / minute |
| Per entity | 10 uploads / hour |
| Per IP | 100 uploads / hour |

#### Implementation

- Rate limit violations return **HTTP 429 Too Many Requests**
- Include `Retry-After` header with seconds until retry allowed
- Use Redis or in-memory store for rate limit tracking
- Log rate limit violations for security monitoring

### 5. Soft Deletes

Uploads and associated entities must support soft deletion.

#### Requirements

- No file or guideline is **hard-deleted** by default
- All delete operations set `deleted_at` timestamp
- Soft-deleted records:
  - Are excluded from default queries
  - Are not accessible via URLs
  - Can be restored by admins if needed

#### Replacement Behavior

- Uploading new brand guidelines automatically soft-deletes previous guidelines for that entity
- Replacing files preserves history
- Old files remain in database with `deleted_at` set

#### Implementation

- Add `WHERE deleted_at IS NULL` to all default queries
- Admin endpoints can include deleted files with filter parameter
- Implement restore endpoint for admins
- Periodic cleanup job can hard-delete files older than retention period

### 6. Audit Logging

All upload-related actions must be auditable.

#### Log Events

- File uploaded
- Scan completed (clean / infected)
- File deleted (soft)
- File restored
- Guidelines updated or replaced
- Rate limit violation
- MIME type mismatch

#### Logged Metadata

- User ID
- Entity ID (if applicable)
- Action type
- Timestamp
- IP address (if available)
- File metadata (size, type, name)
- Scan results (if applicable)

#### Implementation

- Use structured logging (Pino) with consistent format
- Store audit logs in database or log aggregation service
- Include request context (user, IP, user agent)
- Log security events (infected files, rate limits) with higher priority

### 7. Failure Handling

#### Rules

- Storage failures must **not** create dangling DB records
- DB failures must **not** leave orphaned files in storage
- All operations must be transactional where possible
- Partial failures must be retryable

#### Retryable Operations

- Malware scanning
- Storage uploads
- ZIP extraction
- MIME type detection

#### Implementation

- Use database transactions for file metadata + storage operations
- Implement rollback on storage failure
- Use background jobs for retryable operations
- Track retry attempts and failures
- Alert on persistent failures

### 8. Visibility Rules

| File Status | Visible to Users | Visible to Admins | Usable |
|-------------|------------------|-------------------|--------|
| `pending_scan` | ❌ | ✅ | ❌ |
| `clean` | ✅ | ✅ | ✅ |
| `infected` | ❌ | ✅ | ❌ |
| `deleted` | ❌ | ✅ (with filter) | ❌ |

#### Implementation

- Filter files by status in all user-facing queries
- Admin endpoints can override filters with query parameters
- Public URLs must check file status before serving
- Return 404 or 403 for non-accessible files

### 9. Operational Guarantees

#### Security Guarantees

- Files are never immediately trusted upon upload
- All files must pass malware scanning before use
- MIME type validation prevents file type spoofing
- Rate limiting prevents abuse and DoS attacks
- Soft deletes ensure auditability and recoverability

#### Data Integrity Guarantees

- No orphaned files in storage (transactional operations)
- No dangling database records (rollback on failure)
- File replacements preserve history
- All operations are auditable

#### Operational Guarantees

- Failed operations are retryable
- Background jobs handle long-running operations
- System degrades gracefully on failures
- Monitoring and alerts for security events

---

## Best Practices & Recommendations

### 1. Security

- **Authentication**: All upload endpoints must require authentication
- **Authorization**: Check user permissions (admin for brand guidelines)
- **File Validation**: Always validate file type and size on the server
- **MIME Type Sniffing**: Validate MIME type using file headers, not just extensions
- **Filename Sanitization**: Sanitize filenames to prevent path traversal
- **Malware Scanning**: **Required** - All files must be scanned before use (see Security section)
- **File Status Management**: Enforce file lifecycle and status tracking
- **Rate Limiting**: **Required** - Implement rate limiting to prevent abuse (see Security section)
- **Soft Deletes**: Use soft deletes for auditability and recoverability
- **CORS**: Configure CORS properly for file uploads

### 2. Performance

- **Streaming Uploads**: For large files, consider streaming uploads
- **Chunked Uploads**: Implement chunked uploads for files > 50MB
- **CDN Integration**: Use CDN for file delivery
- **Image Optimization**: Automatically optimize images on upload
- **Lazy Loading**: Generate previews lazily

### 3. Error Handling

- **Graceful Degradation**: Handle storage provider failures gracefully
- **Retry Logic**: Implement retry logic for transient failures
- **Error Messages**: Provide clear, user-friendly error messages
- **Logging**: Log all upload errors for debugging

### 4. Data Management

- **Orphaned Files**: Implement cleanup job for orphaned files
- **File Versioning**: Consider file versioning for updates
- **Backup Strategy**: Implement backup strategy for critical files
- **Lifecycle Policies**: Set up lifecycle policies for old files
- **Soft Deletes**: All deletions must be soft deletes (see Security section)
- **File Status Tracking**: Track file lifecycle status (pending_scan, clean, infected, deleted)
- **Retention Policies**: Define retention periods for deleted files before hard deletion

### 5. Monitoring

- **Upload Metrics**: Track upload success/failure rates
- **Storage Usage**: Monitor storage usage and costs
- **Performance Metrics**: Track upload times and throughput
- **Error Tracking**: Track and alert on upload errors
- **Security Events**: Monitor and alert on:
  - Infected files detected
  - Rate limit violations
  - MIME type mismatches
  - Failed scan attempts
- **File Status Distribution**: Track counts by status (pending_scan, clean, infected, deleted)
- **Scan Performance**: Monitor scan job completion times and failure rates

### 6. Testing

- **Unit Tests**: Test file validation and sanitization
- **Integration Tests**: Test upload endpoints end-to-end
- **Load Tests**: Test with large files and concurrent uploads
- **Error Scenarios**: Test error handling and edge cases

---

## Environment Variables

Add to `env.js`:

```typescript
server: {
  // ... existing variables
  BLOB_STORAGE_PROVIDER: z.enum(["vercel", "s3", "r2"]).optional(),
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(), // Required if using Vercel Blob
  AWS_S3_BUCKET_NAME: z.string().optional(),
  AWS_S3_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  MAX_FILE_SIZE_MB: z.number().default(50).optional(),
  MAX_BRAND_GUIDELINES_SIZE_MB: z.number().default(10).optional(),
}
```

---

## Migration Checklist

- [ ] Create `file_uploads` table migration (with status, scanned_at, scan_result, deleted_at fields)
- [ ] Create `file_status` enum type migration
- [ ] Create `brand_guidelines` table migration (optional)
- [ ] Implement storage abstraction layer
- [ ] Implement malware scanning service
- [ ] Implement malware scan background job (`scan_file` job type)
- [ ] Integrate scan job enqueueing in upload endpoints (MANDATORY)
- [ ] Implement MIME type sniffing utility
- [ ] Implement rate limiting middleware
- [ ] Implement soft delete functionality
- [ ] Implement audit logging for upload operations
- [ ] Implement Vercel Blob provider
- [ ] Implement S3 provider (optional)
- [ ] Implement R2 provider (optional)
- [ ] Create file validation utilities
- [ ] Create filename sanitization utilities
- [ ] Create ZIP extraction utilities
- [ ] Create preview generation utilities
- [ ] Implement `POST /api/upload` endpoint
- [ ] Implement `POST /api/upload-zip` endpoint
- [ ] Implement `PUT /api/admin/{entityType}s/:id/brand-guidelines` endpoints
- [ ] Implement `GET /api/admin/files/:id` endpoint
- [ ] Implement `DELETE /api/admin/files/:id` endpoint
- [ ] Add environment variables to `env.js`
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Set up monitoring and logging
- [ ] Document API endpoints

---

## References

- Frontend Upload Implementation: `features/publisher/components/form/_steps/CreativeDetails.tsx`
- Frontend Upload Modal: `features/publisher/view-models/fileUploadModal.viewModel.ts`
- Brand Guidelines Modal: `features/admin/components/BrandGuidelinesModal.tsx`
- Backend Plan: `docs/BACKEND_SEQUENTIAL_PLAN.md`

---

**Last Updated**: 2025-01-01
**Version**: 1.0.0

