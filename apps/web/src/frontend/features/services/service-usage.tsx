import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import type { InferResponseType } from "hono/client";
import { SectionHeading } from "@/components/section-heading";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
} from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RANGE_LABELS,
  ServiceSwitcher,
} from "@/features/services/service-switcher";
import {
  mapUsageSeries,
  sumUsageTotals,
} from "@/features/services/usage/chart-config";
import { UsageQuotaCell } from "@/features/services/usage/quota-cell";
import { UsageStatusBar } from "@/features/services/usage/status-bar";
import {
  UsageLatencyChart,
  UsageVolumeChart,
} from "@/features/services/usage/usage-charts";
import { consumersQuery, serviceQuery, usageQuery } from "@/lib/gateway-queries";
import type { client } from "@/lib/rpc";
import { cn } from "@/lib/utils";

const route = getRouteApi("/$orgId/services/$serviceId/");

type Usage = InferResponseType<typeof client.api.usage.$get, 200>;
type KeyRow = Usage["keys"][number];

const controlHeight =
  "h-7 min-h-7 box-border shrink-0 py-0 text-xs leading-7";

const fieldClass = cn(
  "min-w-0 rounded border border-border bg-muted/40 px-2 font-data text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
  controlHeight,
);

export function ServiceUsagePage() {
  const { orgId, serviceId } = route.useParams();
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const { data: service } = useSuspenseQuery(serviceQuery(serviceId));
  const { data: usage } = useSuspenseQuery(usageQuery(serviceId, search));
  const { data: consumers } = useSuspenseQuery(consumersQuery(serviceId));

  const totals = sumUsageTotals(usage.series);
  const successRate =
    totals.count > 0 ? (totals.ok / totals.count) * 100 : null;

  const series = mapUsageSeries(usage.series, search.range);
  const hasSeries = series.length > 0;
  const hasFilters = search.consumer !== "all" || search.key !== "";

  const setSearch = (patch: Partial<typeof search>) =>
    navigate({
      search: (previous) => ({ ...previous, ...patch }),
      replace: true,
    });

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-20">
      <section className="grid gap-5">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <ServiceSwitcher
            orgId={orgId}
            serviceId={serviceId}
            serviceName={service.name}
            range={search.range}
            onRangeChange={(next) => setSearch({ range: next })}
          />
          <div className="grid shrink-0 gap-2 text-right">
            <p className="text-xs text-muted-foreground">Proxied requests</p>
            <p className="font-data text-3xl font-medium tracking-tight">
              {totals.count.toLocaleString()}
            </p>
            {totals.count > 0 ? (
              <div className="grid gap-1.5 sm:ml-auto sm:max-w-xs">
                <UsageStatusBar
                  ok={totals.ok}
                  err4={totals.err4}
                  err5={totals.err5}
                />
                <p className="font-data text-[11px] text-muted-foreground">
                  {successRate?.toFixed(1)}% success
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={search.consumer}
            onValueChange={(value) => setSearch({ consumer: value })}
          >
            <SelectTrigger
              size="sm"
              className={cn(fieldClass, "w-44 shadow-none")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-data text-xs">
                All consumers
              </SelectItem>
              {consumers.map((consumer) => (
                <SelectItem
                  key={consumer.id}
                  value={consumer.id}
                  className="font-data text-xs"
                >
                  {consumer.externalRef ?? consumer.id.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            value={search.key}
            onChange={(e) => setSearch({ key: e.target.value })}
            placeholder="Filter by key prefix…"
            className={cn(fieldClass, "w-44")}
          />
        </div>
      </section>

      <section className="grid gap-5">
        <SectionHeading
          title="Volume"
          description={`Request volume over the last ${RANGE_LABELS[search.range]}.`}
        />
        {hasSeries ? (
          <UsageVolumeChart data={series} />
        ) : (
          <ChartEmpty
            message={
              hasFilters
                ? "No traffic matches these filters in this range."
                : `No proxied requests in the last ${RANGE_LABELS[search.range]} yet.`
            }
          />
        )}
      </section>

      <section className="grid gap-5">
        <SectionHeading
          title="Latency"
          description={`Average response time over the last ${RANGE_LABELS[search.range]}.`}
        />
        {hasSeries ? (
          <UsageLatencyChart data={series} />
        ) : (
          <ChartEmpty
            message={
              hasFilters
                ? "No latency data matches these filters."
                : `No latency data in the last ${RANGE_LABELS[search.range]} yet.`
            }
          />
        )}
      </section>

      <section className="grid gap-5">
        <SectionHeading
          title="Keys"
          description="Consumers by request volume."
        />
        {usage.keys.length === 0 ? (
          <Empty className="p-4 md:p-4">
            <EmptyHeader>
              <EmptyDescription className="text-xs">
                {hasFilters
                  ? "No keys match these filters."
                  : "No keys issued for this service yet."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-x-auto rounded-md border text-[11px]">
            <div className="grid min-w-[36rem] grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_4rem_3rem_minmax(0,1.2fr)_3.5rem] gap-2 border-b bg-muted/30 px-2.5 py-1.5 text-muted-foreground">
              <span>Key</span>
              <span>Consumer</span>
              <span className="text-right text-[10px]">Requests</span>
              <span className="text-right text-[10px]">Share</span>
              <span>Quota</span>
              <span className="text-right text-[10px]">Avg ms</span>
            </div>
            {usage.keys.map((key) => (
              <KeyRow key={key.keyId} row={key} totalCount={totals.count} />
            ))}
          </div>
        )}
      </section>
    </div>
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

function KeyRow({ row, totalCount }: { row: KeyRow; totalCount: number }) {
  const share =
    totalCount > 0 ? Math.round((row.count / totalCount) * 100) : 0;
  const avgMs =
    row.count > 0 ? Math.round(row.latencyMsSum / row.count) : null;

  return (
    <div className="grid min-w-[36rem] grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_4rem_3rem_minmax(0,1.2fr)_3.5rem] items-center gap-2 border-b px-2.5 py-2 last:border-0">
      <code className="truncate">{row.prefix}</code>
      <span className="truncate text-muted-foreground">
        {row.consumerExternalRef ?? row.consumerId.slice(0, 8)}
      </span>
      <span className="font-data text-right text-[10px] tabular-nums">
        {row.count.toLocaleString()}
      </span>
      <span className="font-data text-right text-[10px] text-muted-foreground tabular-nums">
        {totalCount > 0 ? `${share}%` : "—"}
      </span>
      <UsageQuotaCell
        monthCount={row.monthCount}
        monthlyQuota={row.monthlyQuota}
      />
      <span className="font-data text-right text-[10px] text-muted-foreground tabular-nums">
        {avgMs === null ? "—" : avgMs}
      </span>
    </div>
  );
}
