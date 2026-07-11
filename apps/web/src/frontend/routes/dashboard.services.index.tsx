import { ServicesPage } from "@/features/services/services-page";
import { servicesQueryOptions } from "@/features/services/queries";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/services/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(servicesQueryOptions),
  component: ServicesPage,
});
