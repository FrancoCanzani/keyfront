import { plansQueryOptions } from "@/features/plans/queries";
import { NewServicePage } from "@/features/services/new-service-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/services/new")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(plansQueryOptions),
  component: NewServicePage,
});
