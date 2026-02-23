import { z } from "zod";

export const brandGuidelinesSchema = z.object({
  type: z.enum(["url", "file", "text"]).nullable(),
  url: z.string().url().optional().or(z.literal("")),
  fileUrl: z.string().url().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  text: z.string().optional(),
  notes: z.string().optional(),
});

export const createAdvertiserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  contactEmail: z.string().email().optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]).optional(),
  externalId: z.string().optional(),
  brandGuidelines: brandGuidelinesSchema.optional(),
});

export const updateAdvertiserSchema = createAdvertiserSchema.partial().extend({
  id: z.string().min(1),
});

export const createPublisherSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  contactEmail: z.string().email().optional().or(z.literal("")),
  status: z.string().optional(),
});

export const updatePublisherSchema = createPublisherSchema.partial().extend({
  id: z.string().min(1),
});

export const createOfferSchema = z.object({
  name: z.string().min(1, "Offer name is required").max(200),
  advertiserId: z.string().min(1, "Advertiser is required"),
  status: z.enum(["Active", "Inactive"]).default("Active"),
  visibility: z.enum(["Public", "Internal", "Hidden"]).default("Public"),
  brandGuidelinesFileId: z.string().optional(),
  everflowOfferId: z.string().optional(),
});

export const updateOfferSchema = createOfferSchema.partial().extend({
  id: z.string().min(1),
});

export const bulkUpdateOffersSchema = z.object({
  offerIds: z.array(z.string().min(1)).min(1),
  visibility: z.enum(["Public", "Internal", "Hidden"]).optional(),
  status: z.enum(["Active", "Inactive"]).optional(),
});

const cuidSchema = z
  .string()
  .min(1, "ID cannot be empty")
  .max(100, "ID is too long");

const isoDateStringSchema = z.string().refine(
  (val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  },
  { message: "Invalid date format. Expected ISO 8601 date string." }
);

export const auditLogsQuerySchema = z
  .object({
    adminId: cuidSchema.optional(),
    actionType: z
      .enum(["APPROVE", "REJECT"], {
        message: "actionType must be APPROVE or REJECT",
      })
      .optional(),
    action: z
      .enum(["APPROVE", "REJECT"], {
        message: "action must be APPROVE or REJECT",
      })
      .optional(),
    startDate: isoDateStringSchema.optional(),
    endDate: isoDateStringSchema.optional(),
    from: isoDateStringSchema.optional(),
    to: isoDateStringSchema.optional(),
    page: z.coerce.number().int().min(1, "Page must be at least 1").default(1),
    limit: z.coerce
      .number()
      .int()
      .min(1, "Limit must be at least 1")
      .max(100, "Limit cannot exceed 100")
      .default(20),
  })
  .refine(
    (data) => {
      const start = data.startDate || data.from;
      const end = data.endDate || data.to;
      if (start && end) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        return startDate <= endDate;
      }
      return true;
    },
    {
      message: "startDate/from must be less than or equal to endDate/to",
      path: ["startDate"],
    }
  );

export const createBatchSchema = z.object({
  batchLabel: z
    .string()
    .min(1, "Batch label is required")
    .max(200, "Batch label must not exceed 200 characters")
    .trim(),
  description: z
    .string()
    .max(1000, "Description must not exceed 1000 characters")
    .trim()
    .nullable()
    .optional()
    .transform((val) => val ?? undefined),
  status: z.enum(["active", "inactive", "archived"]).default("active"),
  createdBy: z.string().min(1, "Created by is required"),
});

export const updateBatchSchema = z.object({
  batchLabel: z
    .string()
    .min(1, "Batch label is required")
    .max(200, "Batch label must not exceed 200 characters")
    .trim()
    .optional(),
  description: z
    .string()
    .max(1000, "Description must not exceed 1000 characters")
    .trim()
    .nullable()
    .optional()
    .transform((val) => val ?? undefined),
  status: z.enum(["active", "inactive", "archived"]).optional(),
});

export const listBatchesQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["active", "inactive", "archived"]).optional(),
  createdBy: z.string().optional(),
});

export const removeAssetFromBatchSchema = z.object({
  assetId: z.string().min(1, "Asset ID is required"),
});

export const moveAssetBetweenBatchesSchema = z.object({
  assetId: z.string().min(1, "Asset ID is required"),
  toBatchId: z.string().min(1, "Destination batch ID is required"),
});

export const batchAnalyticsQuerySchema = z.object({
  batchIds: z.string().optional(),
});
