import { z } from "zod";

export const logStatusFilterSchema = z.enum(["all", "2xx", "4xx", "5xx"]);
export const logSortFieldSchema = z.enum(["ts", "status", "ms", "method", "path"]);
export const logSortOrderSchema = z.enum(["asc", "desc"]);

export const logsQuerySchema = z.object({
  serviceId: z.string().min(1),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(10).max(100).default(50),
  status: logStatusFilterSchema.default("all"),
  method: z.string().default("all"),
  key: z.string().default(""),
  sort: logSortFieldSchema.default("ts"),
  order: logSortOrderSchema.default("desc"),
});

export type LogsQuery = z.infer<typeof logsQuerySchema>;
