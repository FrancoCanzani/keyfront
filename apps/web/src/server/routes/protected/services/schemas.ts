import { z } from "zod";

// DNS label: becomes {hostKey}.gw.<domain>, immutable after creation
export const hostKeySchema = z
  .string()
  .min(3)
  .max(40)
  .regex(
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
    "lowercase letters, digits and hyphens; must start and end alphanumeric",
  );

export const createServiceSchema = z.object({
  name: z.string().min(1).max(80),
  hostKey: hostKeySchema,
  originUrl: z.url({ protocol: /^https?$/ }),
});

export const updateServiceSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  originUrl: z.url({ protocol: /^https?$/ }).optional(),
});

export const serviceIdParamSchema = z.object({
  id: z.string().min(1),
});
