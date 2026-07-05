import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import type { InferResponseType } from "hono/client";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TimestampInfo } from "@/components/timestamp-info";
import { GatewaySnippets } from "@/features/services/gateway-snippets";
import { logsQuery, serviceQuery } from "@/lib/gateway-queries";
import type { client } from "@/lib/rpc";
import { cn } from "@/lib/utils";

const route = getRouteApi("/$orgId/services/$serviceId/logs");

type LogEntry = InferResponseType<typeof client.api.logs.$get, 200>[number];

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "2xx", label: "2xx" },
  { value: "4xx", label: "4xx" },
  { value: "5xx", label: "5xx" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];

const SUCCESS_GREEN = "#15803d";

const STATUS_TEXT: Record<number, string> = {
  200: "OK",
  201: "Created",
  204: "No Content",
  301: "Moved Permanently",
  302: "Found",
  400: "Bad Request",
  401: "Unauthorized",
  402: "Payment Required",
  403: "Forbidden",
  404: "Not Found",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
};

const chartConfig = {
  ok: { label: "2xx/3xx", color: SUCCESS_GREEN },
  err4: { label: "4xx", color: "#ec835a" },
  err5: { label: "5xx", color: "#d03b3b" },
} satisfies ChartConfig;

const controlHeight =
  "h-8 min-h-8 box-border shrink-0 py-0 text-sm leading-8";

const pillClass = cn(
  "inline-flex items-center justify-center rounded border border-border bg-muted/40 px-2.5 font-normal transition-colors hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-50",
  controlHeight,
);

const fieldClass = cn(
  "min-w-0 rounded border border-border bg-muted/40 px-2 font-data text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
  controlHeight,
);

function matchesStatus(status: number, filter: StatusFilter) {
  switch (filter) {
    case "all":
      return true;
    case "2xx":
      return status < 400;
    case "4xx":
      return status >= 400 && status < 500;
    case "5xx":
      return status >= 500;
    default: {
      const _exhaustive: never = filter;
      return _exhaustive;
    }
  }
}

const statusBadgeClassName = (status: number) =>
  status >= 500
    ? "bg-[#d03b3b]/10 text-[#d03b3b]"
    : status >= 400
      ? "bg-[#ec835a]/10 text-[#ec835a]"
      : "bg-[#15803d]/10 text-[#15803d]";

const entryId = (entry: LogEntry) =>
  `${entry.ts}-${entry.method}-${entry.path}-${entry.status}-${entry.ms}`;

function formatVolumeTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildVolumeSeries(entries: LogEntry[]) {
  if (entries.length < 2) return [];
  const min = entries[entries.length - 1].ts;
  const max = entries[0].ts;
  const span = Math.max(max - min, 60_000);
  const slotCount = 40;
  const slotSize = span / slotCount;

  const slots = Array.from({ length: slotCount }, (_, i) => ({
    ts: min + i * slotSize,
    ok: 0,
    err4: 0,
    err5: 0,
  }));
  for (const entry of entries) {
    const index = Math.min(
      Math.floor((entry.ts - min) / slotSize),
      slotCount - 1,
    );
    if (entry.status >= 500) slots[index].err5 += 1;
    else if (entry.status >= 400) slots[index].err4 += 1;
    else slots[index].ok += 1;
  }
  return slots.map((slot) => ({
    ...slot,
    label: formatVolumeTime(slot.ts),
  }));
}

export function ServiceLogsPage() {
  const { serviceId } = route.useParams();
  const { status, method, key } = route.useSearch();
  const navigate = route.useNavigate();
  const { data: service } = useSuspenseQuery(serviceQuery(serviceId));
  const [live, setLive] = useState(true);
  const [selected, setSelected] = useState<LogEntry | null>(null);
  const { data: logs } = useSuspenseQuery({
    ...logsQuery(serviceId),
    refetchInterval: live ? 5_000 : false,
  });

  const methods = useMemo(
    () => [...new Set(logs.map((entry) => entry.method))].sort(),
    [logs],
  );
  const filtered = useMemo(
    () =>
      logs.filter(
        (entry) =>
          matchesStatus(entry.status, status) &&
          (method === "all" || entry.method === method) &&
          (key === "" || entry.keyPrefix.startsWith(key)),
      ),
    [logs, status, method, key],
  );
  const volume = useMemo(() => buildVolumeSeries(filtered), [filtered]);

  const setSearch = (
    patch: Partial<{ status: StatusFilter; method: string; key: string }>,
  ) =>
    navigate({
      search: (previous) => ({ ...previous, ...patch }),
      replace: true,
    });

  if (logs.length === 0) {
    return (
      <div className="mx-auto w-full max-w-4xl text-sm">
        <section className="grid gap-5">
          <SectionHeading
            title="Logs"
            description="Last 100 requests through the gateway, including rejections."
          />
          <Empty className="p-4 md:p-4">
            <EmptyHeader>
              <EmptyTitle className="text-sm">No logs yet</EmptyTitle>
              <EmptyDescription className="text-sm">
                Send your first request to see it here.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <GatewaySnippets hostKey={service.hostKey} />
            </EmptyContent>
          </Empty>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl text-sm">
      <div className="grid gap-10">
        <section className="grid gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <SectionHeading
              title="Logs"
              description="Last 100 requests through the gateway."
            />
            <div className="flex items-center gap-3">
              <span className="font-data text-sm text-muted-foreground tabular-nums">
                {filtered.length} of {logs.length}
              </span>
              <button
                type="button"
                className={cn(pillClass, "gap-1.5 px-2.5")}
                onClick={() => setLive((current) => !current)}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    live
                      ? "animate-pulse bg-[#15803d]"
                      : "bg-muted-foreground/40",
                  )}
                />
                {live ? "Live" : "Paused"}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1">
              {STATUS_FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={cn(
                    pillClass,
                    status === item.value &&
                      "border-foreground/20 bg-muted/60 text-foreground",
                  )}
                  onClick={() => setSearch({ status: item.value })}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <Select
              value={method}
              onValueChange={(value) => setSearch({ method: value })}
            >
              <SelectTrigger
                size="sm"
                className={cn(fieldClass, "w-28 shadow-none")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-data text-sm">
                  All methods
                </SelectItem>
                {methods.map((item) => (
                  <SelectItem key={item} value={item} className="font-data text-sm">
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              value={key}
              onChange={(e) => setSearch({ key: e.target.value })}
              placeholder="Filter by key prefix…"
              className={cn(fieldClass, "w-44")}
            />
          </div>
        </section>

        {volume.length > 0 ? (
          <section className="grid gap-3">
            <SectionHeading
              title="Volume"
              description="Request rate across the filtered window."
            />
            <ChartContainer config={chartConfig} className="h-20 w-full">
              <BarChart data={volume} barCategoryGap={1}>
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={6}
                  interval="preserveStartEnd"
                  minTickGap={80}
                  tick={{ fontSize: 14, fontFamily: "var(--font-mono)" }}
                />
                <YAxis hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="ok" stackId="v" fill="var(--color-ok)" />
                <Bar dataKey="err4" stackId="v" fill="var(--color-err4)" />
                <Bar
                  dataKey="err5"
                  stackId="v"
                  fill="var(--color-err5)"
                  radius={[1, 1, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </section>
        ) : null}

        <section className="grid gap-3">
          {filtered.length === 0 ? (
            <Empty className="p-4 md:p-4">
              <EmptyHeader>
                <EmptyDescription className="text-sm">
                  No requests match these filters.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <LogsTable
              rows={filtered}
              selected={selected}
              onSelect={setSelected}
            />
          )}
        </section>
      </div>

      <LogDetailSheet entry={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function LogsTable({
  rows,
  selected,
  onSelect,
}: {
  rows: LogEntry[];
  selected: LogEntry | null;
  onSelect: (entry: LogEntry) => void;
}) {
  return (
    <div className="overflow-hidden rounded border border-border">
      <div className="max-h-[calc(100dvh-20rem)] overflow-auto">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col className="w-[15%]" />
            <col className="w-[8%]" />
            <col className="w-[8%]" />
            <col className="w-[18%]" />
            <col className="w-[10%]" />
            <col className="w-[41%]" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-background">
            <tr className="border-b border-border">
              <th className="h-9 px-2 text-left text-sm font-normal text-muted-foreground">
                Time
              </th>
              <th className="h-9 px-2 text-left text-sm font-normal text-muted-foreground">
                Status
              </th>
              <th className="h-9 px-2 text-left text-sm font-normal text-muted-foreground">
                Method
              </th>
              <th className="h-9 px-2 text-left text-sm font-normal text-muted-foreground">
                Path
              </th>
              <th className="h-9 px-2 text-right text-sm font-normal text-muted-foreground">
                Latency
              </th>
              <th className="h-9 px-2 text-left text-sm font-normal text-muted-foreground">
                Key
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => (
              <tr
                key={entryId(entry)}
                tabIndex={0}
                className={cn(
                  "cursor-pointer border-0 hover:bg-muted/50",
                  entry.status >= 500 && "bg-[#d03b3b]/5",
                  entry.status >= 400 &&
                    entry.status < 500 &&
                    "bg-[#ec835a]/5",
                  selected &&
                    entryId(entry) === entryId(selected) &&
                    "bg-muted",
                )}
                onClick={() => onSelect(entry)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(entry);
                  }
                }}
              >
                <td className="px-2 py-2 text-muted-foreground">
                  <TimestampInfo
                    value={entry.ts}
                    className="text-sm text-muted-foreground"
                  />
                </td>
                <td className="px-2 py-2">
                  <span
                    className={cn(
                      "inline-flex rounded px-1.5 py-0.5 font-data text-xs tabular-nums",
                      statusBadgeClassName(entry.status),
                    )}
                  >
                    {entry.status}
                  </span>
                </td>
                <td className="px-2 py-2 font-data">{entry.method}</td>
                <td
                  className="max-w-0 px-2 py-2 font-data text-muted-foreground"
                  title={entry.path}
                >
                  <span className="block truncate">{entry.path}</span>
                </td>
                <td className="px-2 py-2 text-right font-data text-muted-foreground tabular-nums">
                  {entry.ms} ms
                </td>
                <td
                  className="max-w-0 px-2 py-2 font-data text-muted-foreground"
                  title={
                    entry.keyPrefix === "-" ? undefined : entry.keyPrefix
                  }
                >
                  <span className="block truncate">
                    {entry.keyPrefix === "-" ? "—" : `${entry.keyPrefix}…`}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LogDetailSheet({
  entry,
  onClose,
}: {
  entry: LogEntry | null;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={entry !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent side="right" className="gap-4 p-4">
        {entry ? (
          <>
            <SheetHeader className="p-0">
              <SheetTitle className="flex items-center gap-2 font-data text-sm">
                <span>{entry.method}</span>
                <span className="truncate font-normal text-muted-foreground">
                  {entry.path}
                </span>
              </SheetTitle>
              <div className="text-sm text-muted-foreground">
                <TimestampInfo
                  value={entry.ts}
                  displayType="datetime"
                  className="text-sm text-muted-foreground"
                />
              </div>
            </SheetHeader>

            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex rounded px-1.5 py-0.5 font-data text-sm tabular-nums",
                  statusBadgeClassName(entry.status),
                )}
              >
                {entry.status}
              </span>
              <span className="text-sm text-muted-foreground">
                {STATUS_TEXT[entry.status] ?? ""}
              </span>
            </div>

            <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-3 gap-y-2 border-t pt-4 font-data text-sm">
              {entry.outcome ? (
                <>
                  <dt className="text-muted-foreground">Outcome</dt>
                  <dd>{entry.outcome}</dd>
                </>
              ) : null}
              <dt className="text-muted-foreground">Latency</dt>
              <dd className="tabular-nums">{entry.ms} ms</dd>
              <dt className="text-muted-foreground">Key</dt>
              <dd>
                {entry.keyPrefix === "-" ? "No key sent" : entry.keyPrefix}
              </dd>
              <dt className="text-muted-foreground">Method</dt>
              <dd>{entry.method}</dd>
              <dt className="text-muted-foreground">Path</dt>
              <dd className="break-all">{entry.path}</dd>
              {entry.region ? (
                <>
                  <dt className="text-muted-foreground">Region</dt>
                  <dd className="uppercase">{entry.region}</dd>
                </>
              ) : null}
              {entry.userAgent ? (
                <>
                  <dt className="text-muted-foreground">User agent</dt>
                  <dd className="break-all font-sans">{entry.userAgent}</dd>
                </>
              ) : null}
            </dl>

            <pre className="overflow-x-auto rounded border border-border bg-muted/40 p-2.5 font-data text-sm leading-relaxed">
              {JSON.stringify(entry, null, 2)}
            </pre>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
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
    <h2 className="m-0 text-sm leading-snug">
      <span className="font-medium text-foreground">{title}.</span>{" "}
      <span className="text-muted-foreground">{description}</span>
    </h2>
  );
}
