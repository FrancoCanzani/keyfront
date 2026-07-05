import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { InferResponseType } from "hono/client";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usageQuery } from "@/lib/gateway-queries";
import type { client } from "@/lib/rpc";

const route = getRouteApi("/$orgId/services/$serviceId/usage");

type Usage = InferResponseType<typeof client.api.usage.$get, 200>;
type KeyRow = Usage["keys"][number];

// validated status trio (dataviz skill): ok/4xx/5xx are states, not series
const chartConfig = {
  ok: { label: "2xx/3xx", color: "#0ca30c" },
  err4: { label: "4xx", color: "#ec835a" },
  err5: { label: "5xx", color: "#d03b3b" },
  avgMs: { label: "Avg latency", color: "#3b82f6" },
} satisfies ChartConfig;

const columnHelper = createColumnHelper<KeyRow>();

const columns = [
  columnHelper.accessor("prefix", {
    header: () => <span className="px-2">Key</span>,
    cell: (info) => <code className="px-2 text-xs">{info.getValue()}</code>,
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

export function ServiceUsagePage() {
  const { serviceId } = route.useParams();
  const { range } = route.useSearch();
  const navigate = route.useNavigate();
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
    avgMs: b.count > 0 ? Math.round(b.latencyMsSum / b.count) : 0,
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
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No traffic in this range yet</EmptyTitle>
            <EmptyDescription>
              Send an authenticated request through the gateway and it shows up
              here within a minute.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
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
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Average latency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-56 w-full">
                <LineChart data={series}>
                  <CartesianGrid vertical={false} strokeOpacity={0.4} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    allowDecimals={false}
                    unit="ms"
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    dataKey="avgMs"
                    stroke="var(--color-avgMs)"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-medium">By key</h2>
        {data.keys.length === 0 ? (
          <Empty className="p-6 md:p-6">
            <EmptyHeader>
              <EmptyDescription>
                No keys issued for this service yet.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <DataTable table={table} />
        )}
      </section>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-data text-xl font-medium">{value}</p>
    </div>
  );
}
