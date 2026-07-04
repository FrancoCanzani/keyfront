import { z } from "zod";

export const logsQuerySchema = z.object({
  serviceId: z.string().min(1),
});
