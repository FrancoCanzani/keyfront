import { identitiesQueryOptions } from "@/features/identities/queries";
import { ServiceKeysPage } from "@/features/keys/service-keys-page";
import { keysQueryOptions } from "@/features/keys/queries";
import { plansQueryOptions } from "@/features/plans/queries";
import { serviceQueryOptions } from "@/features/services/queries";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/services/$serviceId/keys")({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(
        serviceQueryOptions(params.serviceId),
      ),
      context.queryClient.ensureQueryData(keysQueryOptions(params.serviceId)),
      context.queryClient.ensureQueryData(identitiesQueryOptions),
      context.queryClient.ensureQueryData(plansQueryOptions(params.serviceId)),
    ]),
  component: ServiceKeysPage,
});
