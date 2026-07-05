import { ServiceTestPage } from "@/features/services/service-test";
import { serviceQuery } from "@/lib/gateway-queries";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$orgId/services/$serviceId/test")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(serviceQuery(params.serviceId)),
  component: ServiceTestPage,
});
