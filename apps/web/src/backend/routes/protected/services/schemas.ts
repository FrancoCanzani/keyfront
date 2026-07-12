import { z } from "zod";
import { service } from "../../../db/schema/service";
import { RESERVED_LABELS } from "../../../lib/reserved-labels";

export const labelRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

export const serviceColumns = {
  id: service.id,
  organizationId: service.organizationId,
  name: service.name,
  host: service.host,
  upstream: service.upstream,
  createdAt: service.createdAt,
  updatedAt: service.updatedAt,
};

export const createServiceSchema = z.object({
  name: z.string().min(1).max(100),
  label: z
    .string()
    .regex(labelRegex, "Lowercase letters, numbers, and hyphens only")
    .refine(
      (label) => !RESERVED_LABELS.has(label),
      "That subdomain is reserved",
    ),
  upstream: z.url(),
});

export const updateServiceSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    upstream: z.url().optional(),
  })
  .refine((updates) => Object.keys(updates).length > 0, "Nothing to update");

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
