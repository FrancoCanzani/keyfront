import { ServiceReferencePage } from "@/features/services/service-reference";
import { specQuery } from "@/lib/gateway-queries";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$orgId/services/$serviceId/reference")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(specQuery(params.serviceId)),
  component: ServiceReferencePage,
});
