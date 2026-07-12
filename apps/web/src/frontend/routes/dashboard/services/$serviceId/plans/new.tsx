import { NewPlanPage } from "@/features/plans/new-plan-page";
import { serviceQueryOptions } from "@/features/services/queries";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/dashboard/services/$serviceId/plans/new",
)({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(serviceQueryOptions(params.serviceId)),
  component: NewPlanPage,
});
