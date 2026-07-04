import { DashboardShell } from "@/components/dashboard-shell";
import { orgInfoQuery } from "@/lib/gateway-queries";
import { getOrganizationId, setOrganizationId } from "@/lib/org-api";
import { authClient } from "@/lib/auth-client";
import {
  isReservedOrgId,
  isValidPostAuthRedirect,
} from "@/lib/auth-redirect";
import { redirectLegacyServicesPath } from "@/lib/legacy-redirect";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/$orgId")({
  beforeLoad: async ({ context, params, location }) => {
    if (params.orgId === "services") {
      const legacyPath = `${location.pathname}${location.search}`;
      throw redirect(await redirectLegacyServicesPath(legacyPath));
    }

    if (isReservedOrgId(params.orgId)) {
      throw redirect({ to: "/" });
    }

    const { data } = await authClient.getSession();
    if (!data) {
      const target = `/${params.orgId}/services`;
      throw redirect({
        to: "/sign-in",
        search: isValidPostAuthRedirect(target) ? { redirect: target } : {},
      });
    }

    const previous = getOrganizationId();
    if (previous && previous !== params.orgId) {
      context.queryClient.clear();
    }
    setOrganizationId(params.orgId);

    let organization;
    try {
      organization = await context.queryClient.ensureQueryData(
        orgInfoQuery(params.orgId),
      );
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status === 401 || status === 403 || status === 404) {
        setOrganizationId(null);
        throw redirect({ to: "/" });
      }
      throw error;
    }

    if (data.session.activeOrganizationId !== params.orgId) {
      await authClient.organization.setActive({ organizationId: params.orgId });
    }

    return { user: data.user, organization };
  },
  component: DashboardShell,
});
