import { AppTopBar } from "@/components/app-top-bar";
import {
  dashboardChromeClass,
  dashboardSectionGapClass,
} from "@/components/dashboard-chrome";
import { ServiceNav } from "@/features/services/service-nav";
import { authClient } from "@/lib/auth-client";
import { parseDashboardRoute } from "@/lib/dashboard-route";
import { serviceQuery } from "@/lib/gateway-queries";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";

const orgRouteApi = getRouteApi("/$orgId");

export function DashboardShell() {
  const { user, organization } = orgRouteApi.useRouteContext();
  const { orgId } = orgRouteApi.useParams();
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const { serviceId, isServiceDetail } = parseDashboardRoute(pathname);

  const { data: service } = useQuery({
    ...serviceQuery(serviceId ?? ""),
    enabled: isServiceDetail && serviceId != null,
  });

  async function signOut() {
    await authClient.signOut();
    navigate({ to: "/sign-in" });
  }

  const shellUser = {
    name: user.name || user.email,
    email: user.email,
  };

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background">
      <div
        className={cn(
          "flex shrink-0 flex-col",
          dashboardSectionGapClass,
          dashboardChromeClass,
          "pt-5",
        )}
      >
        <AppTopBar
          orgId={orgId}
          orgName={organization.name}
          user={shellUser}
          onSignOut={signOut}
          serviceName={isServiceDetail ? service?.name : undefined}
        />
        {isServiceDetail && serviceId ? (
          <div className="-mx-6 border-b border-border">
            <ServiceNav
              orgId={orgId}
              serviceId={serviceId}
              className="px-6"
            />
          </div>
        ) : null}
      </div>
      <main
        className={cn(
          "min-h-0 flex-1 overflow-y-auto",
          dashboardChromeClass,
          "pt-5 pb-10",
        )}
      >
        <Outlet />
      </main>
    </div>
  );
}
