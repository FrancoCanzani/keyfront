import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { PageShell } from "@/components/page-shell";
import { ServiceNav } from "@/features/services/service-nav";
import { gatewayDomain, serviceQuery } from "@/lib/gateway-queries";

export const Route = createFileRoute("/$orgId/services/$serviceId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(serviceQuery(params.serviceId)),
  component: ServiceLayout,
});

function ServiceLayout() {
  const { serviceId } = Route.useParams();
  const { data: service } = useSuspenseQuery(serviceQuery(serviceId));

  return (
    <PageShell
      header={
        <PageHeader
          title={service.name}
          subtitle={
            <code className="font-mono tabular-nums">
              {`${service.hostKey}.${gatewayDomain}`}
            </code>
          }
          nav={<ServiceNav />}
        />
      }
    >
      <Outlet />
    </PageShell>
  );
}
