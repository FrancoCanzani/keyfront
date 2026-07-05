import { ServiceOverviewPage } from "@/features/services/service-overview";
import { serviceQuery, servicesQuery, usageQuery } from "@/lib/gateway-queries";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  range: z.enum(["24h", "7d", "30d"]).default("7d"),
});

export const Route = createFileRoute("/$orgId/services/$serviceId/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ range: search.range }),
  loader: ({ context, params, deps }) =>
    Promise.all([
      context.queryClient.ensureQueryData(serviceQuery(params.serviceId)),
      context.queryClient.ensureQueryData(servicesQuery),
      context.queryClient.ensureQueryData(
        usageQuery(params.serviceId, deps.range),
      ),
    ]),
  component: ServiceOverviewPage,
});
