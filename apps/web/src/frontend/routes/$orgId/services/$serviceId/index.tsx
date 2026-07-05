import { ServiceUsagePage } from "@/features/services/service-usage";
import {
  consumersQuery,
  serviceQuery,
  servicesQuery,
  usageQuery,
} from "@/lib/gateway-queries";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  range: z.enum(["24h", "7d", "30d"]).default("7d"),
  key: z.string().default(""),
  consumer: z.string().default("all"),
});

export const Route = createFileRoute("/$orgId/services/$serviceId/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, params, deps: search }) =>
    Promise.all([
      context.queryClient.ensureQueryData(serviceQuery(params.serviceId)),
      context.queryClient.ensureQueryData(servicesQuery),
      context.queryClient.ensureQueryData(usageQuery(params.serviceId, search)),
      context.queryClient.ensureQueryData(consumersQuery(params.serviceId)),
    ]),
  component: ServiceUsagePage,
});
