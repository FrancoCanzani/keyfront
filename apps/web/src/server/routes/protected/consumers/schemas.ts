import { z } from "zod";

export const listConsumersQuerySchema = z.object({
  serviceId: z.string().min(1),
});

export const createConsumerSchema = z.object({
  serviceId: z.string().min(1),
  externalRef: z.string().min(1).max(160).nullable().default(null),
});
