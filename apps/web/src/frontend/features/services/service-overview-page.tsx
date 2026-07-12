import { CopyRow } from "@/components/copy-row";
import { DashboardHeader } from "@/features/dashboard/dashboard-header";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { serviceQueryOptions } from "./queries";

const route = getRouteApi("/dashboard/services/$serviceId/");

export function ServiceOverviewPage() {
  const { serviceId } = route.useParams();
  const serviceQuery = useQuery(serviceQueryOptions(serviceId));

  const service = serviceQuery.data;

  if (!service) {
    return (
      <>
        <DashboardHeader
          breadcrumbs={[{ label: "Services", href: "/dashboard" }]}
        />
        <div className="px-3 py-4">
          <p className="text-sm text-muted-foreground">Loading service...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardHeader
        breadcrumbs={[
          { label: "Services", href: "/dashboard" },
          { label: service.name },
        ]}
      />

      <div className="px-3 py-4">
        <div className="max-w-xl space-y-6">
          <div>
            <h1 className="text-lg font-medium">{service.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Created {new Date(service.createdAt).toLocaleDateString()}
            </p>
          </div>

          <CopyRow label="Gateway URL" value={`https://${service.host}`} />

          <dl className="divide-y divide-border rounded-md border">
            <div className="flex items-center justify-between gap-4 px-3 py-2.5">
              <dt className="text-xs text-muted-foreground">Origin</dt>
              <dd className="truncate font-mono text-xs">{service.upstream}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-3 py-2.5">
              <dt className="text-xs text-muted-foreground">Gateway secret</dt>
              <dd className="text-xs text-muted-foreground">
                Shown once at creation
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </>
  );
}
