import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { gatewayDomain, serviceQuery } from "@/lib/gateway-queries";

export const Route = createFileRoute("/_app/services/$serviceId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(serviceQuery(params.serviceId)),
  component: ServiceLayout,
});

const tabClass = "border-b-2 border-transparent pb-2 text-sm text-muted-foreground";
const activeTabClass = "border-b-2 border-foreground pb-2 text-sm font-medium text-foreground";

function ServiceLayout() {
  const { serviceId } = Route.useParams();
  const { data: service } = useSuspenseQuery(serviceQuery(serviceId));

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/services"
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Services
        </Link>
        <h1 className="mt-1 text-lg font-medium">{service.name}</h1>
        <code className="text-xs text-muted-foreground">
          {`${service.hostKey}.${gatewayDomain}`} → {service.originUrl}
        </code>
      </div>

      <nav className="flex gap-5 border-b">
        <Link
          to="/services/$serviceId"
          params={{ serviceId }}
          activeOptions={{ exact: true }}
          className={tabClass}
          activeProps={{ className: activeTabClass }}
        >
          Overview
        </Link>
        <Link
          to="/services/$serviceId/plans"
          params={{ serviceId }}
          className={tabClass}
          activeProps={{ className: activeTabClass }}
        >
          Plans
        </Link>
        <Link
          to="/services/$serviceId/keys"
          params={{ serviceId }}
          className={tabClass}
          activeProps={{ className: activeTabClass }}
        >
          Consumers & keys
        </Link>
      </nav>

      <Outlet />
    </div>
  );
}
