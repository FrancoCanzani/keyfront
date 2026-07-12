import { z } from "zod";

export const playgroundRequestSchema = z.object({
  serviceId: z.string(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  path: z.string().max(2000),
  headers: z
    .array(z.object({ name: z.string().max(200), value: z.string().max(2000) }))
    .max(20),
  body: z.string().max(100_000).optional(),
  apiKey: z.string().min(1).max(200),
});

export type PlaygroundRequestInput = z.infer<typeof playgroundRequestSchema>;
