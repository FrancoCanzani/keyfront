import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { InferResponseType } from "hono/client";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { DataTable } from "@/components/ui/data-table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logsQuery, usageQuery } from "@/lib/gateway-queries";
import type { client } from "@/lib/rpc";

const searchSchema = z.object({
  range: z.enum(["24h", "7d", "30d"]).default("7d"),
});

export const Route = createFileRoute("/$orgId/services/$serviceId/usage")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ range: search.range }),
  loader: ({ context, params, deps }) =>
    Promise.all([
      context.queryClient.ensureQueryData(
        usageQuery(params.serviceId, deps.range),
      ),
      context.queryClient.ensureQueryData(logsQuery(params.serviceId)),
    ]),
  component: UsageTab,
});

type Usage = InferResponseType<typeof client.api.usage.$get, 200>;
type KeyRow = Usage["keys"][number];

// validated status trio (dataviz skill): ok/4xx/5xx are states, not series
const chartConfig = {
  ok: { label: "2xx/3xx", color: "#0ca30c" },
  err4: { label: "4xx", color: "#ec835a" },
  err5: { label: "5xx", color: "#d03b3b" },
} satisfies ChartConfig;

const columnHelper = createColumnHelper<KeyRow>();

const columns = [
  columnHelper.accessor("prefix", {
    header: () => <span className="px-2">Key</span>,
    cell: (info) => <code className="px-2 text-xs">{info.getValue()}…</code>,
  }),
  columnHelper.accessor("consumerExternalRef", {
    header: () => <span className="px-2">Consumer</span>,
    cell: (info) => (
      <span className="px-2">{info.getValue() ?? info.row.original.keyId.slice(0, 8)}</span>
    ),
  }),
  columnHelper.accessor("count", {
    header: () => <span className="px-2">Requests</span>,
    cell: (info) => <span className="px-2">{info.getValue().toLocaleString()}</span>,
  }),
  columnHelper.display({
    id: "errors",
    header: () => <span className="px-2">Errors</span>,
    cell: (info) => {
      const { err4, err5 } = info.row.original;
      return <span className="px-2">{(err4 + err5).toLocaleString()}</span>;
    },
  }),
  columnHelper.display({
    id: "latency",
    header: () => <span className="px-2">Avg latency</span>,
    cell: (info) => {
      const { count, latencyMsSum } = info.row.original;
      return (
        <span className="px-2">
          {count > 0 ? `${Math.round(latencyMsSum / count)} ms` : "—"}
        </span>
      );
    },
  }),
  columnHelper.display({
    id: "quota",
    header: () => <span className="px-2">Quota this month</span>,
    cell: (info) => {
      const { monthCount, monthlyQuota } = info.row.original;
      if (monthlyQuota === null) {
        return <span className="px-2 text-muted-foreground">Unlimited</span>;
      }
      const pct = Math.min(100, Math.round((monthCount / monthlyQuota) * 100));
      return (
        <div className="flex items-center gap-2 px-2">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
            <div
              className={pct >= 100 ? "h-full bg-[#d03b3b]" : "h-full bg-foreground/70"}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {monthCount.toLocaleString()} / {monthlyQuota.toLocaleString()}
          </span>
        </div>
      );
    },
  }),
  columnHelper.accessor("lastUsedAt", {
    header: () => <span className="px-2">Last used</span>,
    cell: (info) => (
      <span className="px-2 text-muted-foreground">
        {info.getValue() ? new Date(info.getValue() as string).toLocaleString() : "Never"}
      </span>
    ),
  }),
];

function UsageTab() {
  const { serviceId } = Route.useParams();
  const { range } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data } = useSuspenseQuery(usageQuery(serviceId, range));

  const totals = data.series.reduce(
    (acc, b) => ({
      count: acc.count + b.count,
      errors: acc.errors + b.err4 + b.err5,
      latencyMsSum: acc.latencyMsSum + b.latencyMsSum,
    }),
    { count: 0, errors: 0, latencyMsSum: 0 },
  );

  const series = data.series.map((b) => ({
    ...b,
    label:
      range === "24h"
        ? new Date(b.bucket).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : new Date(b.bucket).toLocaleDateString([], { month: "short", day: "numeric" }),
  }));

  const table = useReactTable({
    data: data.keys,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="grid grid-cols-3 gap-4">
          <StatTile label="Requests" value={totals.count.toLocaleString()} />
          <StatTile
            label="Error rate"
            value={
              totals.count > 0
                ? `${((totals.errors / totals.count) * 100).toFixed(1)}%`
                : "—"
            }
          />
          <StatTile
            label="Avg latency"
            value={
              totals.count > 0
                ? `${Math.round(totals.latencyMsSum / totals.count)} ms`
                : "—"
            }
          />
        </div>
        <Tabs
          value={range}
          onValueChange={(value) =>
            navigate({
              search: { range: value as typeof range },
              replace: true,
            })
          }
        >
          <TabsList>
            <TabsTrigger value="24h">24h</TabsTrigger>
            <TabsTrigger value="7d">7d</TabsTrigger>
            <TabsTrigger value="30d">30d</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {series.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No traffic in this range yet. Send an authenticated request through
          the gateway and it shows up here within a minute.
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Requests by status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-56 w-full">
              <BarChart data={series}>
                <CartesianGrid vertical={false} strokeOpacity={0.4} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="ok" stackId="status" fill="var(--color-ok)" />
                <Bar dataKey="err4" stackId="status" fill="var(--color-err4)" />
                <Bar
                  dataKey="err5"
                  stackId="status"
                  fill="var(--color-err5)"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-medium">By key</h2>
        {data.keys.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No keys issued for this service yet.
          </div>
        ) : (
          <DataTable table={table} />
        )}
      </section>

      <RecentRequests serviceId={serviceId} />
    </div>
  );
}

type LogEntry = InferResponseType<typeof client.api.logs.$get, 200>[number];

const logColumnHelper = createColumnHelper<LogEntry>();

const statusClassName = (status: number) =>
  status >= 500
    ? "text-[#d03b3b]"
    : status >= 400
      ? "text-[#ec835a]"
      : "text-[#0ca30c]";

const logColumns = [
  logColumnHelper.accessor("ts", {
    header: () => <span className="px-2">Time</span>,
    cell: (info) => (
      <span className="px-2 font-mono text-xs text-muted-foreground tabular-nums">
        {new Date(info.getValue()).toLocaleTimeString()}
      </span>
    ),
  }),
  logColumnHelper.accessor("method", {
    header: () => <span className="px-2">Method</span>,
    cell: (info) => <code className="px-2 text-xs">{info.getValue()}</code>,
  }),
  logColumnHelper.accessor("path", {
    header: () => <span className="px-2">Path</span>,
    cell: (info) => (
      <code className="block max-w-56 truncate px-2 text-xs">
        {info.getValue()}
      </code>
    ),
  }),
  logColumnHelper.accessor("status", {
    header: () => <span className="px-2">Status</span>,
    cell: (info) => (
      <span
        className={`px-2 font-mono text-xs font-medium tabular-nums ${statusClassName(info.getValue())}`}
      >
        {info.getValue()}
      </span>
    ),
  }),
  logColumnHelper.accessor("ms", {
    header: () => <span className="px-2">Latency</span>,
    cell: (info) => (
      <span className="px-2 font-mono text-xs text-muted-foreground tabular-nums">
        {info.getValue()} ms
      </span>
    ),
  }),
  logColumnHelper.accessor("keyPrefix", {
    header: () => <span className="px-2">Key</span>,
    cell: (info) => (
      <code className="px-2 text-xs text-muted-foreground">
        {info.getValue() === "-" ? "—" : `${info.getValue()}…`}
      </code>
    ),
  }),
];

function RecentRequests({ serviceId }: { serviceId: string }) {
  const { data: logs } = useSuspenseQuery(logsQuery(serviceId));

  const table = useReactTable({
    data: logs,
    columns: logColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium">Recent requests</h2>
        <span className="text-xs text-muted-foreground">
          Last {logs.length} · includes gateway rejections · live
        </span>
      </div>
      {logs.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nothing yet — requests appear here the moment they hit the gateway.
        </div>
      ) : (
        <DataTable table={table} />
      )}
    </section>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-medium">{value}</p>
    </div>
  );
}
