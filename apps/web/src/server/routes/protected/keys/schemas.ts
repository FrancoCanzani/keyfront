import { z } from "zod";

export const listKeysQuerySchema = z.object({
  serviceId: z.string().min(1),
});

export const createKeySchema = z.object({
  consumerId: z.string().min(1),
  planId: z.string().min(1),
  expiresAt: z.iso.date().nullable().default(null),
});

export const keyIdParamSchema = z.object({
  id: z.string().min(1),
});
