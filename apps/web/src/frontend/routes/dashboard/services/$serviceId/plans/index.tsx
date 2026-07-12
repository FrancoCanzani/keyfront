import { ServicePlansPage } from "@/features/plans/plans-page";
import { plansQueryOptions } from "@/features/plans/queries";
import { serviceQueryOptions } from "@/features/services/queries";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/services/$serviceId/plans/")({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(
        serviceQueryOptions(params.serviceId),
      ),
      context.queryClient.ensureQueryData(plansQueryOptions(params.serviceId)),
    ]),
  component: ServicePlansPage,
});
