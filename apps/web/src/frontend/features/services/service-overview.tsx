import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import type { InferResponseType } from "hono/client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
} from "@/components/ui/empty";
import {
  RANGE_LABELS,
  ServiceSwitcher,
} from "@/features/services/service-switcher";
import { serviceQuery, usageQuery } from "@/lib/gateway-queries";
import type { client } from "@/lib/rpc";
import { cn } from "@/lib/utils";

const route = getRouteApi("/$orgId/services/$serviceId/");

type Usage = InferResponseType<typeof client.api.usage.$get, 200>;
type KeyRow = Usage["keys"][number];

const SUCCESS_GREEN = "#15803d";

const chartConfig = {
  ok: { label: "2xx/3xx", color: SUCCESS_GREEN },
  err4: { label: "4xx", color: "#ec835a" },
  err5: { label: "5xx", color: "#d03b3b" },
  avgMs: { label: "Avg latency", color: "#3b82f6" },
} satisfies ChartConfig;

export function ServiceOverviewPage() {
  const { orgId, serviceId } = route.useParams();
  const { range } = route.useSearch();
  const navigate = route.useNavigate();
  const { data: service } = useSuspenseQuery(serviceQuery(serviceId));
  const { data: usage } = useSuspenseQuery(usageQuery(serviceId, range));

  const totals = usage.series.reduce(
    (result, point) => ({
      count: result.count + point.count,
      ok: result.ok + point.ok,
      err4: result.err4 + point.err4,
      err5: result.err5 + point.err5,
      latencyMsSum: result.latencyMsSum + point.latencyMsSum,
    }),
    { count: 0, ok: 0, err4: 0, err5: 0, latencyMsSum: 0 },
  );
  const successRate =
    totals.count > 0 ? (totals.ok / totals.count) * 100 : null;

  const series = usage.series.map((point) => ({
    ...point,
    avgMs: point.count > 0 ? Math.round(point.latencyMsSum / point.count) : 0,
    label:
      range === "24h"
        ? new Date(point.bucket).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : new Date(point.bucket).toLocaleDateString([], {
            month: "short",
            day: "numeric",
          }),
  }));

  const topKeys = usage.keys.slice(0, 5);
  const hasSeries = series.length > 0;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-20">
      <section className="flex items-start justify-between gap-6">
        <ServiceSwitcher
          orgId={orgId}
          serviceId={serviceId}
          serviceName={service.name}
          range={range}
          onRangeChange={(next) =>
            navigate({
              search: { range: next },
              replace: true,
            })
          }
        />
        <div className="grid shrink-0 gap-2 text-right">
          <p className="text-xs text-muted-foreground">Proxied requests</p>
          <p className="font-data text-3xl font-medium tracking-tight">
            {totals.count.toLocaleString()}
          </p>
          {totals.count > 0 ? (
            <div className="grid gap-1.5 sm:ml-auto sm:max-w-xs">
              <StatusBar ok={totals.ok} err4={totals.err4} err5={totals.err5} />
              <p className="font-data text-[11px] text-muted-foreground">
                {successRate?.toFixed(1)}% success
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-5">
        <div className="flex items-baseline justify-between gap-4">
          <SectionHeading
            title="Usage"
            description={`Request volume over the last ${RANGE_LABELS[range]}.`}
          />
          <Link
            to="/$orgId/services/$serviceId/usage"
            params={{ orgId, serviceId }}
            search={{ range }}
            className="font-data text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            View usage
          </Link>
        </div>
        {hasSeries ? (
          <ChartContainer config={chartConfig} className="h-44 w-full">
            <BarChart data={series}>
              <CartesianGrid vertical={false} strokeOpacity={0.4} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={32}
                allowDecimals={false}
                tick={{ fontSize: 10 }}
              />
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
        ) : (
          <ChartEmpty
            message={`No proxied requests in the last ${RANGE_LABELS[range]} yet.`}
          />
        )}
      </section>

      <section className="grid gap-5">
        <SectionHeading
          title="Latency"
          description={`Average response time over the last ${RANGE_LABELS[range]}.`}
        />
        {hasSeries ? (
          <ChartContainer config={chartConfig} className="h-44 w-full">
            <LineChart data={series}>
              <CartesianGrid vertical={false} strokeOpacity={0.4} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={32}
                allowDecimals={false}
                unit="ms"
                tick={{ fontSize: 10 }}
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
        ) : (
          <ChartEmpty
            message={`No latency data in the last ${RANGE_LABELS[range]} yet.`}
          />
        )}
      </section>

      <section className="grid gap-5">
        <div className="flex items-baseline justify-between gap-4">
          <SectionHeading
            title="Keys"
            description="Top consumers by request volume."
          />
          {usage.keys.length > 5 ? (
            <Link
              to="/$orgId/services/$serviceId/usage"
              params={{ orgId, serviceId }}
              search={{ range }}
              className="font-data text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              View all
            </Link>
          ) : null}
        </div>
        {topKeys.length === 0 ? (
          <Empty className="p-4 md:p-4">
            <EmptyHeader>
              <EmptyDescription className="text-xs">
                No keys issued for this service yet.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-hidden rounded-md border text-[11px]">
            <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_4rem_3rem_minmax(0,1.2fr)_3.5rem] gap-2 border-b bg-muted/30 px-2.5 py-1.5 text-muted-foreground">
              <span>Key</span>
              <span>Consumer</span>
              <span className="text-right text-[10px]">Requests</span>
              <span className="text-right text-[10px]">Share</span>
              <span>Quota</span>
              <span className="text-right text-[10px]">Avg ms</span>
            </div>
            {topKeys.map((key) => (
              <KeyRow key={key.keyId} row={key} totalCount={totals.count} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <h2 className="font-data text-xs">
      <span className="text-foreground">{title}.</span>{" "}
      <span className="text-muted-foreground">{description}</span>
    </h2>
  );
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <Empty className="p-4 md:p-4">
      <EmptyHeader>
        <EmptyDescription className="text-xs">{message}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function StatusBar({
  ok,
  err4,
  err5,
}: {
  ok: number;
  err4: number;
  err5: number;
}) {
  const total = ok + err4 + err5;
  if (total === 0) return null;

  const segments = [
    { value: ok, className: "bg-[#15803d]" },
    { value: err4, className: "bg-[#ec835a]" },
    { value: err5, className: "bg-[#d03b3b]" },
  ].filter((segment) => segment.value > 0);

  return (
    <div className="flex h-1 gap-px overflow-hidden rounded-none bg-muted">
      {segments.map((segment) => (
        <div
          key={segment.className}
          className={cn("h-full min-w-0.5", segment.className)}
          style={{ flexGrow: segment.value, flexBasis: 0 }}
        />
      ))}
    </div>
  );
}

function KeyRow({ row, totalCount }: { row: KeyRow; totalCount: number }) {
  const share =
    totalCount > 0 ? Math.round((row.count / totalCount) * 100) : 0;
  const avgMs =
    row.count > 0 ? Math.round(row.latencyMsSum / row.count) : null;

  return (
    <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_4rem_3rem_minmax(0,1.2fr)_3.5rem] items-center gap-2 border-b px-2.5 py-2 last:border-0">
      <code className="truncate">{row.prefix}</code>
      <span className="truncate text-muted-foreground">
        {row.consumerExternalRef ?? row.keyId.slice(0, 8)}
      </span>
      <span className="font-data text-right text-[10px] tabular-nums">
        {row.count.toLocaleString()}
      </span>
      <span className="font-data text-right text-[10px] text-muted-foreground tabular-nums">
        {totalCount > 0 ? `${share}%` : "—"}
      </span>
      <QuotaCell monthCount={row.monthCount} monthlyQuota={row.monthlyQuota} />
      <span className="font-data text-right text-[10px] text-muted-foreground tabular-nums">
        {avgMs === null ? "—" : avgMs}
      </span>
    </div>
  );
}

function QuotaCell({
  monthCount,
  monthlyQuota,
}: {
  monthCount: number;
  monthlyQuota: number | null;
}) {
  if (monthlyQuota === null) {
    return <span className="text-muted-foreground">Unlimited</span>;
  }

  const pct = Math.min(100, Math.round((monthCount / monthlyQuota) * 100));

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <div className="flex h-1 min-w-0 flex-1 gap-px overflow-hidden rounded-sm bg-muted">
        {Array.from({ length: 10 }, (_, index) => (
          <div
            key={index}
            className={cn(
              "h-full flex-1",
              index < Math.ceil(pct / 10)
                ? pct >= 100
                  ? "bg-[#d03b3b]"
                  : "bg-foreground/70"
                : "bg-transparent",
            )}
          />
        ))}
      </div>
      <span className="font-data shrink-0 text-[10px] text-muted-foreground tabular-nums">
        {pct}%
      </span>
    </div>
  );
}
