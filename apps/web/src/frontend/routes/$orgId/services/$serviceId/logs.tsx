import { ServiceLogsPage } from "@/features/services/service-logs";
import { logsQuery, serviceQuery } from "@/lib/gateway-queries";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  status: z.enum(["all", "2xx", "4xx", "5xx"]).default("all"),
  method: z.string().default("all"),
  key: z.string().default(""),
});

export const Route = createFileRoute("/$orgId/services/$serviceId/logs")({
  validateSearch: searchSchema,
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(serviceQuery(params.serviceId)),
      context.queryClient.ensureQueryData(logsQuery(params.serviceId)),
    ]),
  component: ServiceLogsPage,
});
