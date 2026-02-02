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
    startDate: isoDateStringSchema.optional(),
    endDate: isoDateStringSchema.optional(),
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
      if (data.startDate && data.endDate) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        return start <= end;
      }
      return true;
    },
    {
      message: "startDate must be less than or equal to endDate",
      path: ["startDate"],
    }
  );
