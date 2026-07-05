import { z } from "zod";

export const usageQuerySchema = z.object({
  serviceId: z.string().min(1),
  range: z.enum(["24h", "7d", "30d"]).default("7d"),
  key: z.string().default(""),
  consumer: z.string().default("all"),
});

export type UsageQuery = z.infer<typeof usageQuerySchema>;
