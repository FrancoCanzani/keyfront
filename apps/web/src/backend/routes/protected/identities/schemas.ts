import { z } from "zod";

export const createIdentitySchema = z.object({
  externalId: z.string().min(1).max(256),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type CreateIdentityInput = z.infer<typeof createIdentitySchema>;
