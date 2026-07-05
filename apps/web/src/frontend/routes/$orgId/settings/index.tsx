import { GeneralSettingsPage } from "@/features/organization/general-settings";
import { fullOrganizationQuery } from "@/lib/organization-queries";
import { servicesQuery } from "@/lib/gateway-queries";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$orgId/settings/")({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(fullOrganizationQuery(params.orgId)),
      context.queryClient.ensureQueryData(servicesQuery),
    ]),
  component: GeneralSettingsPage,
});
