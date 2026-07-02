import { z } from "zod";

export const jobTypeValues = ["Full-time", "Part-time", "Contract", "Internship"] as const;

export const jobCreateSchema = z.object({
  title: z.string().trim().min(1, "Job title is required").max(120),
  company: z.string().trim().min(1, "Company is required").max(120),
  location: z.string().trim().min(1, "Location is required").max(120),
  type: z.string().trim().refine((value) => jobTypeValues.includes(value as (typeof jobTypeValues)[number]), {
    message: "Please select a valid job type",
  }),
  description: z.string().trim().min(20, "Description must be at least 20 characters").max(4000),
}).strict();

export const jobUpdateSchema = jobCreateSchema.partial().strict();

export type JobCreateInput = z.infer<typeof jobCreateSchema>;
export type JobUpdateInput = z.infer<typeof jobUpdateSchema>;
