import { z } from "zod";

export const listKeysQuerySchema = z.object({
  serviceId: z.string().min(1),
});

export const createKeySchema = z.object({
  consumerId: z.string().min(1),
  planId: z.string().min(1),
  expiresAt: z.iso.date().nullable().default(null),
  name: z.string().trim().max(64).nullable().default(null),
  environment: z.enum(["live", "test"]).default("live"),
});

export const updateKeySchema = z.object({
  enabled: z.boolean().optional(),
  name: z.string().trim().max(64).nullable().optional(),
});

export const keyIdParamSchema = z.object({
  id: z.string().min(1),
});
