import { z } from "zod";

const FileSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "File name is required"),
  url: z.string().url("Must be a valid URL"),
  type: z.string(),
  size: z.number().positive(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const PublisherSubmitSchema = z.object({
  personalDetails: z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    telegramId: z.string().optional(),
  }),
  creativeDetails: z.object({
    brand_name: z.string().min(1, "Brand name is required"),
    project_name: z.string().min(1, "Project name is required"),
    guidelines: z.string().optional(),
    notes: z.string().optional(),
  }),
  files: z.array(FileSchema).min(1, "At least one file is required"),
});
