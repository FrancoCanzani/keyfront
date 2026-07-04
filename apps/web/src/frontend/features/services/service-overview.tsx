import { FormSection } from "@/components/form-layout";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
} from "@/components/ui/empty";
import {
  gatewayDomain,
  logsQuery,
  serviceQuery,
  usageQuery,
} from "@/lib/gateway-queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

const route = getRouteApi("/$orgId/services/$serviceId/");

export function ServiceOverviewPage() {
  const { serviceId } = route.useParams();
  const { data: service } = useSuspenseQuery(serviceQuery(serviceId));
  const { data: usage } = useSuspenseQuery(usageQuery(serviceId, "7d"));
  const { data: logs } = useSuspenseQuery(logsQuery(serviceId));

  const totals = usage.series.reduce(
    (result, point) => ({
      count: result.count + point.count,
      ok: result.ok + point.ok,
      errors: result.errors + point.err4 + point.err5,
      latencyMsSum: result.latencyMsSum + point.latencyMsSum,
    }),
    { count: 0, ok: 0, errors: 0, latencyMsSum: 0 },
  );
  const successRate =
    totals.count > 0 ? (totals.ok / totals.count) * 100 : null;
  const averageLatency =
    totals.count > 0 ? totals.latencyMsSum / totals.count : null;
  const activeKeys = usage.keys.filter((key) => key.status === "active").length;
  const failures = logs.filter((entry) => entry.status >= 400).slice(0, 5);
  const curl = `curl -H "Authorization: Bearer $API_KEY" http://${service.hostKey}.${gatewayDomain}/`;

  return (
    <div className="grid gap-10">
      <FormSection
        title="Overview"
        description="Traffic and reliability over the last 7 days."
      >
        <div className="grid border-y sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Requests" value={totals.count.toLocaleString()} />
          <Metric
            label="Success rate"
            value={successRate === null ? "—" : `${successRate.toFixed(1)}%`}
          />
          <Metric
            label="Average latency"
            value={
              averageLatency === null ? "—" : `${Math.round(averageLatency)} ms`
            }
          />
          <Metric label="Active keys" value={activeKeys.toLocaleString()} />
        </div>
      </FormSection>

      <FormSection
        title="Recent failures"
        description="The latest rejected or unsuccessful requests."
      >
        {failures.length === 0 ? (
          <Empty className="p-6 md:p-6">
            <EmptyHeader>
              <EmptyDescription>No recent failures.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-hidden rounded-md border">
            {failures.map((entry) => (
              <div
                key={`${entry.ts}-${entry.method}-${entry.path}`}
                className="grid grid-cols-[3rem_minmax(0,1fr)_4.5rem_5rem] items-center gap-3 border-b px-3 py-2.5 text-xs last:border-0"
              >
                <span
                  className={
                    entry.status >= 500
                      ? "font-mono font-medium text-destructive"
                      : "font-mono font-medium text-amber-700 dark:text-amber-500"
                  }
                >
                  {entry.status}
                </span>
                <code className="truncate">
                  {entry.method} {entry.path}
                </code>
                <span className="text-right font-mono tabular-nums text-muted-foreground">
                  {entry.ms} ms
                </span>
                <span className="text-right text-muted-foreground">
                  {new Date(entry.ts).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </FormSection>

      <FormSection
        title="Try it"
        description="Issue a key on the Keys tab, then requests to the gateway URL are forwarded to your origin."
      >
        <div className="flex max-w-2xl items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded-lg border bg-muted/40 px-3 py-2 font-mono text-xs tabular-nums">
            {curl}
          </code>
          <Button
            variant="outline"
            className="h-8 shrink-0"
            onClick={() => navigator.clipboard.writeText(curl)}
          >
            Copy
          </Button>
        </div>
      </FormSection>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b px-4 py-4 last:border-b-0 xl:border-b-0 xl:border-l xl:first:border-l-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-medium tabular-nums">{value}</p>
    </div>
  );
}
