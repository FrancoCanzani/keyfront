import { ServiceKeysPage } from "@/features/services/service-keys";
import {
  consumersQuery,
  keysQuery,
  plansQuery,
} from "@/lib/gateway-queries";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$orgId/services/$serviceId/keys")({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(consumersQuery(params.serviceId)),
      context.queryClient.ensureQueryData(plansQuery(params.serviceId)),
      context.queryClient.ensureQueryData(keysQuery(params.serviceId)),
    ]),
  component: ServiceKeysPage,
});
