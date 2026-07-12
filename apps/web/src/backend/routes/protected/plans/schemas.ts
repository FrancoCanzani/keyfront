import { z } from "zod";

export const createPlanSchema = z.object({
  serviceId: z.string().min(1),
  name: z.string().min(1).max(100),
  rateLimit: z.number().int().min(0),
  burst: z.number().int().min(0),
  monthlyQuota: z.number().int().min(0),
});

export const updatePlanSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    rateLimit: z.number().int().min(0).optional(),
    burst: z.number().int().min(0).optional(),
    monthlyQuota: z.number().int().min(0).optional(),
  })
  .refine((updates) => Object.keys(updates).length > 0, "Nothing to update");

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
