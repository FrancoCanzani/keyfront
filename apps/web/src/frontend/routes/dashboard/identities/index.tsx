import { IdentitiesPage } from "@/features/identities/identities-page";
import { identitiesQueryOptions } from "@/features/identities/queries";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/identities/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(identitiesQueryOptions),
  component: IdentitiesPage,
});
