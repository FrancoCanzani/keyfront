import { servicesQueryOptions } from "@/features/services/queries";
import { ServicesPage } from "@/features/services/services-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(servicesQueryOptions),
  component: ServicesPage,
});
