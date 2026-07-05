import { ServiceLogsPage, ServiceLogsSkeleton } from "@/features/services/service-logs";
import { logsQuery, serviceQuery } from "@/lib/gateway-queries";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  status: z.enum(["all", "2xx", "4xx", "5xx"]).default("all"),
  method: z.string().default("all"),
  key: z.string().default(""),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(10).max(100).default(50),
  sort: z.enum(["ts", "status", "ms", "method", "path"]).default("ts"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const Route = createFileRoute("/$orgId/services/$serviceId/logs")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, params, deps: search }) =>
    Promise.all([
      context.queryClient.ensureQueryData(serviceQuery(params.serviceId)),
      context.queryClient.ensureQueryData(
        logsQuery(params.serviceId, search),
      ),
    ]),
  component: ServiceLogsPage,
  pendingComponent: ServiceLogsSkeleton,
});
