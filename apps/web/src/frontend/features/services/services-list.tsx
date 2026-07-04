import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { InferResponseType } from "hono/client";
import { DataTable } from "@/components/ui/data-table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { gatewayDomain, servicesQuery } from "@/lib/gateway-queries";
import { controlClassName } from "@/components/form-layout";
import { NewServiceDialog } from "@/features/services/new-service-dialog";
import type { client } from "@/lib/rpc";

const route = getRouteApi("/$orgId/services/");

type Service = InferResponseType<typeof client.api.services.$get>[number];

const columnHelper = createColumnHelper<Service>();

const columns = [
  columnHelper.accessor("name", {
    header: () => <span className="px-2">Name</span>,
    cell: (info) => (
      <span className="px-2 font-medium">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("hostKey", {
    header: () => <span className="px-2">Gateway URL</span>,
    cell: (info) => (
      <code className="px-2 font-mono text-xs tabular-nums text-muted-foreground">
        {`${info.getValue()}.${gatewayDomain}`}
      </code>
    ),
  }),
  columnHelper.accessor("originUrl", {
    header: () => <span className="px-2">Origin</span>,
    cell: (info) => (
      <code className="px-2 text-xs text-muted-foreground">
        {info.getValue()}
      </code>
    ),
  }),
  columnHelper.accessor("createdAt", {
    header: () => <span className="px-2">Created</span>,
    cell: (info) => (
      <span className="px-2 font-mono text-muted-foreground tabular-nums">
        {new Date(info.getValue()).toLocaleDateString()}
      </span>
    ),
    enableGlobalFilter: false,
  }),
];

export function ServicesPage() {
  const { orgId } = route.useParams();
  const { data } = useSuspenseQuery(servicesQuery);
  const { q } = route.useSearch();
  const navigate = useNavigate();

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter: q },
    onGlobalFilterChange: (value) =>
      navigate({
        to: "/$orgId/services",
        params: { orgId },
        search: { q: typeof value === "string" ? value : "" },
        replace: true,
      }),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-lg font-medium">Services</h1>
        <div className="flex items-center gap-2">
          <Input
            value={q}
            onChange={(e) => table.setGlobalFilter(e.target.value)}
            placeholder="Filter services…"
            className={`${controlClassName} w-44 sm:w-56`}
          />
          <NewServiceDialog orgId={orgId} />
        </div>
      </div>

      {data.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No services yet</EmptyTitle>
            <EmptyDescription>
              Create one to put an API behind the gateway.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <DataTable
          table={table}
          onRowClick={(service) =>
            window.location.assign(`/${orgId}/services/${service.id}`)
          }
        />
      )}
    </div>
  );
}
