import { z } from "zod";

export const fileSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  size: z.number(),
  type: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const submitSchema = z.object({
  affiliateId: z.string().min(1),
  companyName: z.string().min(5), // ✅ 5+ chars (task requirement)
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  telegramId: z.string().optional(),
  offerId: z.string().min(1),
  creativeType: z.string().min(1),
  fromLines: z.string().optional(),
  subjectLines: z.string().optional(),
  additionalNotes: z.string().optional(),
  priority: z.string().optional(),
  files: z.array(fileSchema).optional(),
});

export type SubmitPayload = z.infer<typeof submitSchema>;
