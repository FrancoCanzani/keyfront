import { PlansPage } from "@/features/plans/plans-page";
import { plansQueryOptions } from "@/features/plans/queries";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/plans/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(plansQueryOptions),
  component: PlansPage,
});
