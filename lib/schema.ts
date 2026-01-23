import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  index,
  jsonb,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("advertiser"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  expiresAt: timestamp("expiresAt"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const requestStatusEnum = pgEnum("request_status", [
  "new",
  "pending",
  "approved",
  "rejected",
  "sent-back",
]);

export const approvalStageEnum = pgEnum("approval_stage", [
  "admin",
  "advertiser",
  "completed",
]);

export const adminStatusEnum = pgEnum("admin_status", [
  "pending",
  "approved",
  "rejected",
]);

export const advertiserStatusEnum = pgEnum("advertiser_status", [
  "pending",
  "approved",
  "rejected",
  "sent_back",
]);

export const priorityEnum = pgEnum("priority", [
  "High Priority",
  "Medium Priority",
]);

export const offerStatusEnum = pgEnum("offer_status", ["Active", "Inactive"]);

export const offerVisibilityEnum = pgEnum("offer_visibility", [
  "Public",
  "Internal",
  "Hidden",
]);

export const offerCreatedMethodEnum = pgEnum("offer_created_method", [
  "Manually",
  "API",
]);

export const creativeRequests = pgTable(
  "creative_requests",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    offerId: text("offer_id").notNull(),
    offerName: text("offer_name").notNull(),
    creativeType: text("creative_type").notNull(),
    creativeCount: integer("creative_count").notNull(),
    fromLinesCount: integer("from_lines_count").notNull(),
    subjectLinesCount: integer("subject_lines_count").notNull(),
    publisherId: text("publisher_id").notNull(),
    publisherName: text("publisher_name"),
    email: text("email"),
    telegramId: text("telegram_id"),
    advertiserId: text("advertiser_id").notNull(),
    advertiserName: text("advertiser_name").notNull(),
    affiliateId: text("affiliate_id").notNull(),
    clientId: text("client_id").notNull(),
    clientName: text("client_name").notNull(),
    status: requestStatusEnum("status").notNull().default("new"),
    approvalStage: approvalStageEnum("approval_stage")
      .notNull()
      .default("admin"),
    priority: priorityEnum("priority").notNull(),
    adminStatus: adminStatusEnum("admin_status").default("pending"),
    adminApprovedBy: text("admin_approved_by"),
    adminApprovedAt: timestamp("admin_approved_at"),
    adminComments: text("admin_comments"),
    advertiserStatus: advertiserStatusEnum("advertiser_status"),
    advertiserRespondedBy: text("advertiser_responded_by"),
    advertiserRespondedAt: timestamp("advertiser_responded_at"),
    advertiserComments: text("advertiser_comments"),
    submittedAt: timestamp("submitted_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    statusStageIdx: index("idx_status_stage").on(
      table.status,
      table.approvalStage
    ),
    adminStatusIdx: index("idx_admin_status").on(table.adminStatus),
    advertiserStatusIdx: index("idx_advertiser_status").on(
      table.advertiserStatus
    ),
    submittedAtIdx: index("idx_submitted_at").on(table.submittedAt),
    offerIdIdx: index("idx_offer_id").on(table.offerId),
    advertiserIdIdx: index("idx_advertiser_id").on(table.advertiserId),
  })
);

export const creativeRequestsRelations = relations(
  creativeRequests,
  ({ many }) => ({
    creatives: many(creatives),
  })
);

export const creativeRequestHistory = pgTable(
  "creative_request_history",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    requestId: text("request_id")
      .notNull()
      .references(() => creativeRequests.id, { onDelete: "cascade" }),
    actionType: text("action_type").notNull(),
    oldStatus: text("old_status"),
    newStatus: text("new_status").notNull(),
    oldApprovalStage: text("old_approval_stage"),
    newApprovalStage: text("new_approval_stage").notNull(),
    actionBy: text("action_by").notNull(),
    actionRole: text("action_role").notNull(),
    comments: text("comments"),
    actionAt: timestamp("action_at").notNull().defaultNow(),
  },
  (table) => ({
    requestIdIdx: index("idx_request_id").on(table.requestId),
    actionAtIdx: index("idx_action_at").on(table.actionAt),
  })
);

export const tenants = pgTable("tenants", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color"),
  secondaryColor: text("secondary_color"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const annotations = pgTable("annotations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  creativeRequestId: text("creative_request_id")
    .notNull()
    .references(() => creativeRequests.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  shape: text("shape"),
  coordinates: text("coordinates"),
  comment: text("comment"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const offers = pgTable(
  "offers",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    offerName: text("offer_name").notNull(),
    advertiserId: text("advertiser_id").notNull(),
    advertiserName: text("advertiser_name").notNull(),
    createdMethod: offerCreatedMethodEnum("created_method")
      .notNull()
      .default("Manually"),
    status: offerStatusEnum("status").notNull().default("Active"),
    visibility: offerVisibilityEnum("visibility").notNull().default("Public"),
    brandGuidelines: jsonb("brand_guidelines").$type<{
      type: "url" | "file" | "text" | null;
      url?: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
      text?: string;
      notes?: string;
    }>(),
    everflowOfferId: text("everflow_offer_id").unique(),
    everflowAdvertiserId: text("everflow_advertiser_id"),
    everflowData: jsonb("everflow_data").$type<Record<string, unknown>>(),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index("idx_offer_status").on(table.status),
    visibilityIdx: index("idx_offer_visibility").on(table.visibility),
    createdMethodIdx: index("idx_offer_created_method").on(table.createdMethod),
    advertiserIdIdx: index("idx_offer_advertiser_id").on(table.advertiserId),
    createdAtIdx: index("idx_offer_created_at").on(table.createdAt),
    everflowOfferIdIdx: index("idx_everflow_offer_id").on(
      table.everflowOfferId
    ),
  })
);

export const syncHistory = pgTable(
  "sync_history",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    syncType: text("sync_type").notNull(),
    status: text("status").notNull(),
    startedBy: text("started_by").notNull(),
    totalRecords: integer("total_records").default(0),
    syncedRecords: integer("synced_records").default(0),
    updatedRecords: integer("updated_records").default(0),
    createdRecords: integer("created_records").default(0),
    failedRecords: integer("failed_records").default(0),
    skippedRecords: integer("skipped_records").default(0),
    errorMessage: text("error_message"),
    syncOptions: jsonb("sync_options").$type<{
      conflictResolution?: "skip" | "update" | "merge";
      filters?: Record<string, unknown>;
      limit?: number;
    }>(),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    syncTypeIdx: index("idx_sync_type").on(table.syncType),
    statusIdx: index("idx_sync_status").on(table.status),
    startedAtIdx: index("idx_sync_started_at").on(table.startedAt),
  })
);

export const backgroundJobs = pgTable(
  "background_jobs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    type: text("type").notNull(), // 'everflow_sync'
    status: text("status").notNull(), // 'pending', 'running', 'completed', 'failed', 'cancelled'
    progress: integer("progress").default(0),
    total: integer("total").default(0),
    payload: jsonb("payload"),
    result: jsonb("result"),
    error: text("error"),
    errorType: text("error_type"),
    attempt: integer("attempt").default(0).notNull(),
    maxAttempts: integer("max_attempts").default(3).notNull(),
    retryCount: integer("retry_count").default(0).notNull(),
    maxRetries: integer("max_retries").default(5).notNull(),
    replayCount: integer("replay_count").default(0).notNull(),
    lastReplayAt: timestamp("last_replay_at"),
    lastErrorAt: timestamp("last_error_at"),
    deadLetteredAt: timestamp("dead_lettered_at"),
    nextRunAt: timestamp("next_run_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
    durationMs: integer("duration_ms"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
  },
  (table) => ({
    statusCreatedIdx: index("idx_background_jobs_status_created").on(
      table.status,
      table.createdAt
    ),
    statusNextRunIdx: index("idx_background_jobs_status_next_run").on(
      table.status,
      table.nextRunAt
    ),
  })
);

export const backgroundJobEvents = pgTable(
  "background_job_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    jobId: text("job_id")
      .notNull()
      .references(() => backgroundJobs.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    message: text("message"),
    data: jsonb("data"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    jobIdIdx: index("idx_background_job_events_job_id").on(table.jobId),
    createdAtIdx: index("idx_background_job_events_created_at").on(
      table.createdAt
    ),
  })
);

export const requestStatusHistory = pgTable("request_status_history", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  requestId: text("request_id").notNull(),
  fromStatus: text("from_status").notNull(),
  toStatus: text("to_status").notNull(),
  actorRole: text("actor_role").notNull(),
  actorId: text("actor_id").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const advertisers = pgTable(
  "advertisers",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    name: text("name").notNull(),
    contactEmail: text("contact_email"),
    status: text("status").notNull().default("active"),
    everflowAdvertiserId: text("everflow_advertiser_id"),
    everflowData: jsonb("everflow_data"),
    brandGuidelines: jsonb("brand_guidelines").$type<{
      type: "url" | "file" | "text" | null;
      url?: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
      text?: string;
      notes?: string;
    }>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    everflowAdvertiserIdIdx: index("idx_everflow_advertiser_id").on(
      table.everflowAdvertiserId
    ),
  })
);

export const publishers = pgTable("publishers", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  contactEmail: text("contact_email"),
  telegramId: text("telegram_id"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const fileUploadStatusEnum = pgEnum("file_status", [
  "pending_scan",
  "clean",
  "infected",
  "deleted",
]);

export const fileUploads = pgTable(
  "file_uploads",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    originalName: text("original_name").notNull(),
    storedName: text("stored_name").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    url: text("url").notNull(),
    storageKey: text("storage_key").notNull(),
    storageProvider: text("storage_provider").notNull(),
    uploadedBy: text("uploaded_by")
      .notNull()
      .references(() => user.id),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    status: fileUploadStatusEnum("status").notNull().default("pending_scan"),
    scannedAt: timestamp("scanned_at"),
    scanResult: jsonb("scan_result"),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uploadedByIdx: index("idx_file_uploads_uploaded_by").on(table.uploadedBy),
    entityIdx: index("idx_file_uploads_entity").on(
      table.entityType,
      table.entityId
    ),
    statusIdx: index("idx_file_uploads_status").on(table.status),
    createdAtIdx: index("idx_file_uploads_created_at").on(table.createdAt),
    deletedAtIdx: index("idx_file_uploads_deleted_at").on(table.deletedAt),
  })
);

export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    id: text("id").primaryKey(),
    requestHash: text("request_hash").notNull(),
    responseBody: jsonb("response_body"),
    responseStatus: integer("response_status"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => ({
    expiresAtIdx: index("idx_idempotency_keys_expires_at").on(table.expiresAt),
  })
);

export const systemStates = pgTable("system_states", {
  key: text("key").primaryKey(),
  value: jsonb("value"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const systemSettings = pgTable("system_settings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  key: text("key").unique().notNull(),
  value: text("value").notNull(),
  description: text("description"),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    details: jsonb("details"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("idx_audit_user").on(table.userId),
    actionIdx: index("idx_audit_action").on(table.action),
    createdAtIdx: index("idx_audit_created_at").on(table.createdAt),
  })
);

export const creativeMetadata = pgTable(
  "creative_metadata",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    creativeId: text("creative_id").notNull().unique(), // File URL from blob storage
    fromLines: text("from_lines"),
    subjectLines: text("subject_lines"),
    proofreadingData: jsonb("proofreading_data"),
    htmlContent: text("html_content"),
    additionalNotes: text("additional_notes"),
    metadata: jsonb("metadata").$type<{
      lastSaved?: string;
      lastGenerated?: string;
      lastProofread?: string;
      creativeType?: string;
      fileName?: string;
    }>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    creativeIdIdx: index("idx_creative_metadata_creative_id").on(
      table.creativeId
    ),
    updatedAtIdx: index("idx_creative_metadata_updated_at").on(table.updatedAt),
  })
);

export const creatives = pgTable(
  "creatives",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    requestId: text("request_id").references(() => creativeRequests.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    url: text("url").notNull(),
    type: text("type").notNull(),
    size: integer("size").notNull(),
    format: text("format"),
    status: text("status").notNull().default("pending"),
    metadata: jsonb("metadata").$type<{
      proofreadingData?: {
        success?: boolean;
        issues?: Array<unknown>;
        suggestions?: Array<unknown>;
        qualityScore?: number;
        result?: Record<string, unknown>;
      };
      lastSaved?: string;
      lastGenerated?: string;
      lastProofread?: string;
      creativeType?: string;
      fileName?: string;
    }>(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at"),
  },
  (table) => ({
    requestIdIdx: index("idx_creatives_request_id").on(table.requestId),
    statusIdx: index("idx_creatives_status").on(table.status),
    createdAtIdx: index("idx_creatives_created_at").on(table.createdAt),
  })
);

export const creativesRelations = relations(creatives, ({ one }) => ({
  request: one(creativeRequests, {
    fields: [creatives.requestId],
    references: [creativeRequests.id],
  }),
}));

export const externalTasks = pgTable(
  "external_tasks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),

    creativeId: text("creative_id").notNull(),

    userId: text("user_id"),

    source: text("source").notNull(),

    externalTaskId: text("external_task_id"),

    status: text("status").notNull().default("pending"),
    result: jsonb("result"),

    startedAt: timestamp("started_at").defaultNow(),
    finishedAt: timestamp("finished_at"),
    errorMessage: text("error_message"),
  },
  (table) => ({
    creativeIdIdx: index("idx_external_tasks_creative_id").on(table.creativeId),
    statusIdx: index("idx_external_tasks_status").on(table.status),
    sourceIdx: index("idx_external_tasks_source").on(table.source),
    externalTaskIdIdx: index("idx_external_tasks_external_task_id").on(
      table.externalTaskId
    ),
  })
);
