import { serviceQueryOptions } from "@/features/services/queries";
import { ServiceSettingsPage } from "@/features/services/service-settings-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/services/$serviceId/settings")(
  {
    loader: ({ context, params }) =>
      context.queryClient.ensureQueryData(
        serviceQueryOptions(params.serviceId),
      ),
    component: ServiceSettingsPage,
  },
);
