import { z } from "zod";

export const listPlansQuerySchema = z.object({
  serviceId: z.string().min(1),
});

export const createPlanSchema = z.object({
  serviceId: z.string().min(1),
  name: z.string().min(1).max(80),
  rps: z.number().int().min(1).max(100_000),
  burst: z.number().int().min(1).max(1_000_000),
  monthlyQuota: z.number().int().min(1).nullable(),
  priceCents: z.number().int().min(0),
});

export const updatePlanSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  rps: z.number().int().min(1).max(100_000).optional(),
  burst: z.number().int().min(1).max(1_000_000).optional(),
  monthlyQuota: z.number().int().min(1).nullable().optional(),
  priceCents: z.number().int().min(0).optional(),
});

export const planIdParamSchema = z.object({
  id: z.string().min(1),
});
