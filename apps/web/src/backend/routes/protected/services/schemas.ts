import { z } from "zod";

export const createServiceSchema = z.object({
  name: z.string().min(1).max(100),
  label: z
    .string()
    .regex(
      /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/,
      "Lowercase letters, numbers, and hyphens only",
    ),
  upstream: z.url(),
  defaultPlanId: z.string().min(1, "Select a plan"),
});

export const updateServiceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  upstream: z.url().optional(),
  defaultPlanId: z.string().min(1).nullable().optional(),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
