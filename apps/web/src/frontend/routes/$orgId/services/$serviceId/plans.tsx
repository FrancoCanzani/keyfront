import { ServicePlansPage } from "@/features/services/service-plans";
import { plansQuery } from "@/lib/gateway-queries";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$orgId/services/$serviceId/plans")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(plansQuery(params.serviceId)),
  component: ServicePlansPage,
});
