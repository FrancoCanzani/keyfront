import { ServiceUsagePage } from "@/features/services/service-usage";
import { logsQuery, usageQuery } from "@/lib/gateway-queries";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  range: z.enum(["24h", "7d", "30d"]).default("7d"),
});

export const Route = createFileRoute("/$orgId/services/$serviceId/usage")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ range: search.range }),
  loader: ({ context, params, deps }) =>
    Promise.all([
      context.queryClient.ensureQueryData(
        usageQuery(params.serviceId, deps.range),
      ),
      context.queryClient.ensureQueryData(logsQuery(params.serviceId)),
    ]),
  component: ServiceUsagePage,
});
