import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { InferResponseType } from "hono/client";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { gatewayDomain, servicesQuery } from "@/lib/gateway-queries";
import { controlClassName } from "@/components/form-layout";
import type { client } from "@/lib/rpc";

const searchSchema = z.object({
  q: z.string().default(""),
});

export const Route = createFileRoute("/$orgId/services/")({
  validateSearch: searchSchema,
  loader: ({ context }) => context.queryClient.ensureQueryData(servicesQuery),
  component: ServicesPage,
});

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

function ServicesPage() {
  const { orgId } = Route.useParams();
  const { data } = useSuspenseQuery(servicesQuery);
  const { q } = Route.useSearch();
  const navigate = Route.useNavigate();

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter: q },
    onGlobalFilterChange: (value) =>
      navigate({
        search: { q: typeof value === "string" ? value : "" },
        replace: true,
      }),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <PageShell
      header={
        <PageHeader
          title="Services"
          actions={
            <>
              <Input
                value={q}
                onChange={(e) => table.setGlobalFilter(e.target.value)}
                placeholder="Filter services…"
                className={`${controlClassName} w-44 sm:w-56`}
              />
              <Button asChild className="h-8 shrink-0">
                <Link to="/$orgId/services/new" params={{ orgId }}>
                  New service
                </Link>
              </Button>
            </>
          }
        />
      }
    >
      {data.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No services yet. Create one to put an API behind the gateway.
        </div>
      ) : (
        <DataTable
          table={table}
          onRowClick={(service) =>
            navigate({
              to: "/$orgId/services/$serviceId",
              params: { orgId, serviceId: service.id },
            })
          }
        />
      )}
    </PageShell>
  );
}
