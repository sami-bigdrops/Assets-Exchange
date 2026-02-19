import { relations } from "drizzle-orm/relations";
import { user, session, account, creativeRequests, annotations, creativeRequestHistory, backgroundJobs, backgroundJobEvents, fileUploads, creatives, batches, batchAssets, assetsTable } from "./schema";

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	sessions: many(session),
	accounts: many(account),
	fileUploads: many(fileUploads),
}));

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const annotationsRelations = relations(annotations, ({one}) => ({
	creativeRequest: one(creativeRequests, {
		fields: [annotations.creativeRequestId],
		references: [creativeRequests.id]
	}),
}));

export const creativeRequestsRelations = relations(creativeRequests, ({many}) => ({
	annotations: many(annotations),
	creativeRequestHistories: many(creativeRequestHistory),
	creatives: many(creatives),
}));

export const creativeRequestHistoryRelations = relations(creativeRequestHistory, ({one}) => ({
	creativeRequest: one(creativeRequests, {
		fields: [creativeRequestHistory.requestId],
		references: [creativeRequests.id]
	}),
}));

export const backgroundJobEventsRelations = relations(backgroundJobEvents, ({one}) => ({
	backgroundJob: one(backgroundJobs, {
		fields: [backgroundJobEvents.jobId],
		references: [backgroundJobs.id]
	}),
}));

export const backgroundJobsRelations = relations(backgroundJobs, ({many}) => ({
	backgroundJobEvents: many(backgroundJobEvents),
}));

export const fileUploadsRelations = relations(fileUploads, ({one}) => ({
	user: one(user, {
		fields: [fileUploads.uploadedBy],
		references: [user.id]
	}),
}));

export const creativesRelations = relations(creatives, ({one}) => ({
	creativeRequest: one(creativeRequests, {
		fields: [creatives.requestId],
		references: [creativeRequests.id]
	}),
}));

export const batchAssetsRelations = relations(batchAssets, ({one}) => ({
	batch: one(batches, {
		fields: [batchAssets.batchId],
		references: [batches.id]
	}),
	assetsTable: one(assetsTable, {
		fields: [batchAssets.assetId],
		references: [assetsTable.id]
	}),
}));

export const batchesRelations = relations(batches, ({many}) => ({
	batchAssets: many(batchAssets),
}));

export const assetsTableRelations = relations(assetsTable, ({many}) => ({
	batchAssets: many(batchAssets),
}));