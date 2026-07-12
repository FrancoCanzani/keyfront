import { z } from "zod";

export const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  serviceId: z.string().min(1),
  identityId: z.string().min(1).nullable(),
  planId: z.string().min(1, "Select a plan"),
  environment: z.enum(["live", "test"]),
});

export type CreateKeyInput = z.infer<typeof createKeySchema>;
