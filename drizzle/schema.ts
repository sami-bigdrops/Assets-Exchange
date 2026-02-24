import { pgTable, text, jsonb, timestamp, index, integer, unique, foreignKey, boolean, serial, real, date, doublePrecision, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const adminStatus = pgEnum("admin_status", ['pending', 'approved', 'rejected'])
export const advertiserStatus = pgEnum("advertiser_status", ['pending', 'approved', 'rejected', 'sent_back'])
export const approvalStage = pgEnum("approval_stage", ['admin', 'advertiser', 'completed'])
export const fileStatus = pgEnum("file_status", ['pending_scan', 'clean', 'infected', 'deleted'])
export const offerCreatedMethod = pgEnum("offer_created_method", ['Manually', 'API'])
export const offerStatus = pgEnum("offer_status", ['Active', 'Inactive'])
export const offerVisibility = pgEnum("offer_visibility", ['Public', 'Internal', 'Hidden'])
export const priority = pgEnum("priority", ['High Priority', 'Medium Priority'])
export const requestStatus = pgEnum("request_status", ['new', 'pending', 'approved', 'rejected', 'sent-back'])


export const systemStates = pgTable("system_states", {
	key: text().primaryKey().notNull(),
	value: jsonb(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const backgroundJobs = pgTable("background_jobs", {
	id: text().primaryKey().notNull(),
	type: text().notNull(),
	status: text().notNull(),
	progress: integer().default(0),
	total: integer().default(0),
	payload: jsonb(),
	result: jsonb(),
	error: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	startedAt: timestamp("started_at", { mode: 'string' }),
	finishedAt: timestamp("finished_at", { mode: 'string' }),
	errorType: text("error_type"),
	attempt: integer().default(0).notNull(),
	maxAttempts: integer("max_attempts").default(3).notNull(),
	nextRunAt: timestamp("next_run_at", { mode: 'string' }),
	durationMs: integer("duration_ms"),
	errorCode: text("error_code"),
	errorMessage: text("error_message"),
	retryCount: integer("retry_count").default(0).notNull(),
	maxRetries: integer("max_retries").default(5).notNull(),
	lastErrorAt: timestamp("last_error_at", { mode: 'string' }),
	deadLetteredAt: timestamp("dead_lettered_at", { mode: 'string' }),
	replayCount: integer("replay_count").default(0).notNull(),
	lastReplayAt: timestamp("last_replay_at", { mode: 'string' }),
}, (table) => [
	index("idx_background_jobs_status_created").using("btree", table.status.asc().nullsLast().op("text_ops"), table.createdAt.asc().nullsLast().op("text_ops")),
	index("idx_background_jobs_status_next_run").using("btree", table.status.asc().nullsLast().op("text_ops"), table.nextRunAt.asc().nullsLast().op("text_ops")),
]);

export const auditLogs = pgTable("audit_logs", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	action: text().notNull(),
	entityType: text("entity_type").notNull(),
	entityId: text("entity_id"),
	details: jsonb(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_audit_action").using("btree", table.action.asc().nullsLast().op("text_ops")),
	index("idx_audit_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_audit_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
]);

export const systemSettings = pgTable("system_settings", {
	id: text().primaryKey().notNull(),
	key: text().notNull(),
	value: text().notNull(),
	description: text(),
	updatedBy: text("updated_by"),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("system_settings_key_unique").on(table.key),
]);

export const session = pgTable("session", {
	id: text().primaryKey().notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	token: text().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	ipAddress: text(),
	userAgent: text(),
	userId: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "session_userId_user_id_fk"
		}).onDelete("cascade"),
	unique("session_token_unique").on(table.token),
]);

export const user = pgTable("user", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	emailVerified: boolean().default(false).notNull(),
	image: text(),
	role: text().default('advertiser').notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("user_email_unique").on(table.email),
]);

export const verification = pgTable("verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const account = pgTable("account", {
	id: text().primaryKey().notNull(),
	accountId: text().notNull(),
	providerId: text().notNull(),
	userId: text().notNull(),
	accessToken: text(),
	refreshToken: text(),
	idToken: text(),
	expiresAt: timestamp({ mode: 'string' }),
	password: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "account_userId_user_id_fk"
		}).onDelete("cascade"),
]);

export const tenants = pgTable("tenants", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	logoUrl: text("logo_url"),
	primaryColor: text("primary_color"),
	secondaryColor: text("secondary_color"),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("tenants_slug_unique").on(table.slug),
]);

export const annotations = pgTable("annotations", {
	id: text().primaryKey().notNull(),
	creativeRequestId: text("creative_request_id").notNull(),
	type: text().notNull(),
	shape: text(),
	coordinates: text(),
	comment: text(),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.creativeRequestId],
			foreignColumns: [creativeRequests.id],
			name: "annotations_creative_request_id_creative_requests_id_fk"
		}).onDelete("cascade"),
]);

export const creativeRequestHistory = pgTable("creative_request_history", {
	id: text().primaryKey().notNull(),
	requestId: text("request_id").notNull(),
	actionType: text("action_type").notNull(),
	oldStatus: text("old_status"),
	newStatus: text("new_status").notNull(),
	oldApprovalStage: text("old_approval_stage"),
	newApprovalStage: text("new_approval_stage").notNull(),
	actionBy: text("action_by").notNull(),
	actionRole: text("action_role").notNull(),
	comments: text(),
	actionAt: timestamp("action_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_action_at").using("btree", table.actionAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_request_id").using("btree", table.requestId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.requestId],
			foreignColumns: [creativeRequests.id],
			name: "creative_request_history_request_id_creative_requests_id_fk"
		}).onDelete("cascade"),
]);

export const creativeRequests = pgTable("creative_requests", {
	id: text().primaryKey().notNull(),
	offerId: text("offer_id").notNull(),
	offerName: text("offer_name").notNull(),
	creativeType: text("creative_type").notNull(),
	creativeCount: integer("creative_count").notNull(),
	fromLinesCount: integer("from_lines_count").notNull(),
	subjectLinesCount: integer("subject_lines_count").notNull(),
	publisherId: text("publisher_id").notNull(),
	publisherName: text("publisher_name"),
	advertiserId: text("advertiser_id").notNull(),
	advertiserName: text("advertiser_name").notNull(),
	affiliateId: text("affiliate_id").notNull(),
	clientId: text("client_id").notNull(),
	clientName: text("client_name").notNull(),
	status: requestStatus().default('new').notNull(),
	approvalStage: approvalStage("approval_stage").default('admin').notNull(),
	priority: priority().notNull(),
	adminStatus: adminStatus("admin_status").default('pending'),
	adminApprovedBy: text("admin_approved_by"),
	adminApprovedAt: timestamp("admin_approved_at", { mode: 'string' }),
	adminComments: text("admin_comments"),
	advertiserStatus: advertiserStatus("advertiser_status"),
	advertiserRespondedBy: text("advertiser_responded_by"),
	advertiserRespondedAt: timestamp("advertiser_responded_at", { mode: 'string' }),
	advertiserComments: text("advertiser_comments"),
	submittedAt: timestamp("submitted_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	email: text(),
	telegramId: text("telegram_id"),
	trackingCode: text("tracking_code"),
	fromLines: text("from_lines"),
	subjectLines: text("subject_lines"),
	additionalNotes: text("additional_notes"),
	currentRevision: integer("current_revision").default(1).notNull(),
}, (table) => [
	index("idx_admin_status").using("btree", table.adminStatus.asc().nullsLast().op("enum_ops")),
	index("idx_advertiser_id").using("btree", table.advertiserId.asc().nullsLast().op("text_ops")),
	index("idx_advertiser_status").using("btree", table.advertiserStatus.asc().nullsLast().op("enum_ops")),
	index("idx_offer_id").using("btree", table.offerId.asc().nullsLast().op("text_ops")),
	index("idx_status_stage").using("btree", table.status.asc().nullsLast().op("enum_ops"), table.approvalStage.asc().nullsLast().op("enum_ops")),
	index("idx_submitted_at").using("btree", table.submittedAt.asc().nullsLast().op("timestamp_ops")),
	unique("creative_requests_tracking_code_unique").on(table.trackingCode),
]);

export const requestStatusHistory = pgTable("request_status_history", {
	id: text().primaryKey().notNull(),
	requestId: text("request_id").notNull(),
	fromStatus: text("from_status").notNull(),
	toStatus: text("to_status").notNull(),
	actorRole: text("actor_role").notNull(),
	actorId: text("actor_id").notNull(),
	reason: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const offers = pgTable("offers", {
	id: text().primaryKey().notNull(),
	offerName: text("offer_name").notNull(),
	advertiserId: text("advertiser_id").notNull(),
	advertiserName: text("advertiser_name").notNull(),
	createdMethod: offerCreatedMethod("created_method").default('Manually').notNull(),
	status: offerStatus().default('Active').notNull(),
	visibility: offerVisibility().default('Public').notNull(),
	brandGuidelines: jsonb("brand_guidelines"),
	createdBy: text("created_by"),
	updatedBy: text("updated_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	everflowOfferId: text("everflow_offer_id"),
	everflowAdvertiserId: text("everflow_advertiser_id"),
	everflowData: jsonb("everflow_data"),
}, (table) => [
	index("idx_everflow_offer_id").using("btree", table.everflowOfferId.asc().nullsLast().op("text_ops")),
	index("idx_offer_advertiser_id").using("btree", table.advertiserId.asc().nullsLast().op("text_ops")),
	index("idx_offer_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_offer_created_method").using("btree", table.createdMethod.asc().nullsLast().op("enum_ops")),
	index("idx_offer_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("idx_offer_visibility").using("btree", table.visibility.asc().nullsLast().op("enum_ops")),
	unique("offers_everflow_offer_id_unique").on(table.everflowOfferId),
]);

export const backgroundJobEvents = pgTable("background_job_events", {
	id: text().primaryKey().notNull(),
	jobId: text("job_id").notNull(),
	type: text().notNull(),
	message: text(),
	data: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_background_job_events_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_background_job_events_job_id").using("btree", table.jobId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.jobId],
			foreignColumns: [backgroundJobs.id],
			name: "background_job_events_job_id_background_jobs_id_fk"
		}).onDelete("cascade"),
]);

export const idempotencyKeys = pgTable("idempotency_keys", {
	id: text().primaryKey().notNull(),
	requestHash: text("request_hash").notNull(),
	responseBody: jsonb("response_body"),
	responseStatus: integer("response_status"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
}, (table) => [
	index("idx_idempotency_keys_expires_at").using("btree", table.expiresAt.asc().nullsLast().op("timestamp_ops")),
]);

export const fileUploads = pgTable("file_uploads", {
	id: text().primaryKey().notNull(),
	originalName: text("original_name").notNull(),
	storedName: text("stored_name").notNull(),
	mimeType: text("mime_type").notNull(),
	size: integer().notNull(),
	url: text().notNull(),
	storageKey: text("storage_key").notNull(),
	storageProvider: text("storage_provider").notNull(),
	uploadedBy: text("uploaded_by").notNull(),
	entityType: text("entity_type"),
	entityId: text("entity_id"),
	status: fileStatus().default('pending_scan').notNull(),
	scannedAt: timestamp("scanned_at", { mode: 'string' }),
	scanResult: jsonb("scan_result"),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_file_uploads_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_file_uploads_deleted_at").using("btree", table.deletedAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_file_uploads_entity").using("btree", table.entityType.asc().nullsLast().op("text_ops"), table.entityId.asc().nullsLast().op("text_ops")),
	index("idx_file_uploads_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("idx_file_uploads_uploaded_by").using("btree", table.uploadedBy.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.uploadedBy],
			foreignColumns: [user.id],
			name: "file_uploads_uploaded_by_user_id_fk"
		}),
]);

export const syncHistory = pgTable("sync_history", {
	id: text().primaryKey().notNull(),
	syncType: text("sync_type").notNull(),
	status: text().notNull(),
	startedBy: text("started_by").notNull(),
	totalRecords: integer("total_records").default(0),
	syncedRecords: integer("synced_records").default(0),
	updatedRecords: integer("updated_records").default(0),
	createdRecords: integer("created_records").default(0),
	failedRecords: integer("failed_records").default(0),
	skippedRecords: integer("skipped_records").default(0),
	errorMessage: text("error_message"),
	syncOptions: jsonb("sync_options"),
	startedAt: timestamp("started_at", { mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
}, (table) => [
	index("idx_sync_started_at").using("btree", table.startedAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_sync_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_sync_type").using("btree", table.syncType.asc().nullsLast().op("text_ops")),
]);

export const publishers = pgTable("publishers", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	contactEmail: text("contact_email"),
	status: text().default('active').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	telegramId: text("telegram_id"),
});

export const advertisers = pgTable("advertisers", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	contactEmail: text("contact_email"),
	status: text().default('active').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	everflowAdvertiserId: text("everflow_advertiser_id"),
	everflowData: jsonb("everflow_data"),
	brandGuidelines: jsonb("brand_guidelines"),
}, (table) => [
	index("idx_everflow_advertiser_id").using("btree", table.everflowAdvertiserId.asc().nullsLast().op("text_ops")),
]);

export const creativeMetadata = pgTable("creative_metadata", {
	id: text().primaryKey().notNull(),
	creativeId: text("creative_id").notNull(),
	fromLines: text("from_lines"),
	subjectLines: text("subject_lines"),
	proofreadingData: jsonb("proofreading_data"),
	htmlContent: text("html_content"),
	additionalNotes: text("additional_notes"),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_creative_metadata_creative_id").using("btree", table.creativeId.asc().nullsLast().op("text_ops")),
	index("idx_creative_metadata_updated_at").using("btree", table.updatedAt.asc().nullsLast().op("timestamp_ops")),
	unique("creative_metadata_creative_id_unique").on(table.creativeId),
]);

export const externalTasks = pgTable("external_tasks", {
	id: text().primaryKey().notNull(),
	creativeId: text("creative_id").notNull(),
	userId: text("user_id"),
	source: text().notNull(),
	externalTaskId: text("external_task_id"),
	status: text().default('pending').notNull(),
	result: jsonb(),
	startedAt: timestamp("started_at", { mode: 'string' }).defaultNow(),
	finishedAt: timestamp("finished_at", { mode: 'string' }),
	errorMessage: text("error_message"),
	grammarFeedback: jsonb("grammar_feedback"),
}, (table) => [
	index("idx_external_tasks_creative_id").using("btree", table.creativeId.asc().nullsLast().op("text_ops")),
	index("idx_external_tasks_external_task_id").using("btree", table.externalTaskId.asc().nullsLast().op("text_ops")),
	index("idx_external_tasks_source").using("btree", table.source.asc().nullsLast().op("text_ops")),
	index("idx_external_tasks_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
]);

export const playingWithNeon = pgTable("playing_with_neon", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	value: real(),
});

export const creatives = pgTable("creatives", {
	id: text().primaryKey().notNull(),
	requestId: text("request_id"),
	name: text().notNull(),
	url: text().notNull(),
	type: text().notNull(),
	size: integer().notNull(),
	format: text(),
	status: text().default('pending').notNull(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	statusUpdatedAt: timestamp("status_updated_at", { mode: 'string' }).defaultNow().notNull(),
	scanAttempts: integer("scan_attempts").default(0).notNull(),
	lastScanError: text("last_scan_error"),
	revision: integer().default(1).notNull(),
}, (table) => [
	index("idx_creatives_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_creatives_request_id").using("btree", table.requestId.asc().nullsLast().op("text_ops")),
	index("idx_creatives_request_id_revision").using("btree", table.requestId.asc().nullsLast().op("int4_ops"), table.revision.asc().nullsLast().op("text_ops")),
	index("idx_creatives_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_creatives_status_updated_at").using("btree", table.status.asc().nullsLast().op("timestamp_ops"), table.statusUpdatedAt.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.requestId],
			foreignColumns: [creativeRequests.id],
			name: "creatives_request_id_creative_requests_id_fk"
		}).onDelete("cascade"),
]);

export const dailyStats = pgTable("daily_stats", {
	date: date().primaryKey().notNull(),
	totalSubmitted: integer("total_submitted").notNull(),
	totalApproved: integer("total_approved").notNull(),
	avgApprovalTimeSeconds: doublePrecision("avg_approval_time_seconds"),
	topPublishers: jsonb("top_publishers"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const assetsTable = pgTable("assets_table", {
	id: text().primaryKey().notNull(),
	publisherId: text("publisher_id").notNull(),
	status: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
}, (table) => [
	index("idx_assets_approved_at").using("btree", table.approvedAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_assets_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_assets_publisher_id").using("btree", table.publisherId.asc().nullsLast().op("text_ops")),
	index("idx_assets_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
]);

export const batches = pgTable("batches", {
	id: text().primaryKey().notNull(),
	batchLabel: text("batch_label").notNull(),
	description: text(),
	status: text().default('active').notNull(),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_batches_label").using("btree", table.batchLabel.asc().nullsLast().op("text_ops")),
	index("idx_batches_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
]);

export const batchAssets = pgTable("batch_assets", {
	id: text().primaryKey().notNull(),
	batchId: text("batch_id").notNull(),
	assetId: text("asset_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_batch_assets_asset_id").using("btree", table.assetId.asc().nullsLast().op("text_ops")),
	index("idx_batch_assets_batch_id").using("btree", table.batchId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.batchId],
			foreignColumns: [batches.id],
			name: "fk_batch_assets_batch"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.assetId],
			foreignColumns: [assetsTable.id],
			name: "fk_batch_assets_asset"
		}).onDelete("cascade"),
	unique("uq_batch_asset").on(table.batchId, table.assetId),
]);
