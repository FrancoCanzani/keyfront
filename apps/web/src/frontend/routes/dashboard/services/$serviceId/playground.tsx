import { PlaygroundPage } from "@/features/playground/playground-page";
import { serviceQueryOptions } from "@/features/services/queries";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/services/$serviceId/playground")(
  {
    loader: ({ context, params }) =>
      context.queryClient.ensureQueryData(
        serviceQueryOptions(params.serviceId),
      ),
    component: PlaygroundPage,
  },
);
