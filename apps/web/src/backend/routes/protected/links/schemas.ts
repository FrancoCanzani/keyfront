import { z } from "zod";
import { link } from "../../../db/schema/link";

export const keyRegex = /^[a-zA-Z0-9_-]{3,32}$/;

export const linkColumns = {
  id: link.id,
  key: link.key,
  url: link.url,
  clicks: link.clicks,
  lastClickedAt: link.lastClickedAt,
  expiresAt: link.expiresAt,
  createdAt: link.createdAt,
};

export const createLinkSchema = z.object({
  url: z.url(),
  key: z
    .string()
    .regex(keyRegex, "Letters, numbers, underscores, and hyphens only")
    .optional(),
  expiresAt: z.coerce
    .date()
    .min(new Date(), "Must be in the future")
    .optional(),
});

export type CreateLinkInput = z.infer<typeof createLinkSchema>;
