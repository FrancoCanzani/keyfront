import { serviceQueryOptions } from "@/features/services/queries";
import { ServiceOverviewPage } from "@/features/services/service-overview-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/services/$serviceId/")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(serviceQueryOptions(params.serviceId)),
  component: ServiceOverviewPage,
});
