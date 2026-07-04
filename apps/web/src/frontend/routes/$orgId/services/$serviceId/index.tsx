import { ServiceOverviewPage } from "@/features/services/service-overview";
import {
  logsQuery,
  serviceQuery,
  usageQuery,
} from "@/lib/gateway-queries";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$orgId/services/$serviceId/")({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(serviceQuery(params.serviceId)),
      context.queryClient.ensureQueryData(usageQuery(params.serviceId, "7d")),
      context.queryClient.ensureQueryData(logsQuery(params.serviceId)),
    ]),
  component: ServiceOverviewPage,
});
