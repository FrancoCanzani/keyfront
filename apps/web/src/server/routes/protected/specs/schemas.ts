import { z } from "zod";
import { MAX_SPEC_BYTES } from "../../../lib/openapi";

export const uploadSpecSchema = z
  .object({
    serviceId: z.string().min(1),
    content: z.string().min(1).max(MAX_SPEC_BYTES).optional(),
    url: z.url({ protocol: /^https?$/ }).optional(),
  })
  .refine(
    (value) => Boolean(value.content) !== Boolean(value.url),
    "Provide either content or url",
  );

export const specQuerySchema = z.object({
  serviceId: z.string().min(1),
});

export const syncSpecSchema = z.object({
  serviceId: z.string().min(1),
});

export const specServiceParamSchema = z.object({
  serviceId: z.string().min(1),
});
