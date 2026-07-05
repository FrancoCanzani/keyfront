import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { InferResponseType } from "hono/client";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { DataTable } from "@/components/ui/data-table";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { controlClassName } from "@/components/form-layout";
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
  ok: { label: "2xx/3xx", color: "#0ca30c" },
  err4: { label: "4xx", color: "#ec835a" },
  err5: { label: "5xx", color: "#d03b3b" },
} satisfies ChartConfig;

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
  }
}

const statusDotClassName = (status: number) =>
  status >= 500
    ? "bg-[#d03b3b]"
    : status >= 400
      ? "bg-[#ec835a]"
      : "bg-[#0ca30c]";

const statusTextClassName = (status: number) =>
  status >= 500
    ? "text-[#d03b3b]"
    : status >= 400
      ? "text-[#ec835a]"
      : "text-[#0ca30c]";

const entryId = (entry: LogEntry) =>
  `${entry.ts}-${entry.method}-${entry.path}-${entry.status}-${entry.ms}`;

const columnHelper = createColumnHelper<LogEntry>();

const columns = [
  columnHelper.accessor("ts", {
    header: () => <span className="px-2">Time</span>,
    cell: (info) => (
      <span className="px-2 font-mono text-xs text-muted-foreground tabular-nums">
        {new Date(info.getValue()).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </span>
    ),
  }),
  columnHelper.accessor("status", {
    header: () => <span className="px-2">Status</span>,
    cell: (info) => (
      <span className="flex items-center gap-1.5 px-2">
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            statusDotClassName(info.getValue()),
          )}
        />
        <span
          className={cn(
            "font-mono text-xs font-medium tabular-nums",
            statusTextClassName(info.getValue()),
          )}
        >
          {info.getValue()}
        </span>
      </span>
    ),
  }),
  columnHelper.accessor("method", {
    header: () => <span className="px-2">Method</span>,
    cell: (info) => (
      <code className="px-2 text-xs font-medium">{info.getValue()}</code>
    ),
  }),
  columnHelper.accessor("path", {
    header: () => <span className="px-2">Path</span>,
    cell: (info) => (
      <code className="block max-w-72 truncate px-2 text-xs text-muted-foreground">
        {info.getValue()}
      </code>
    ),
  }),
  columnHelper.accessor("ms", {
    header: () => <span className="px-2 text-right">Latency</span>,
    cell: (info) => (
      <span className="block px-2 text-right font-mono text-xs text-muted-foreground tabular-nums">
        {info.getValue()} ms
      </span>
    ),
  }),
  columnHelper.accessor("keyPrefix", {
    header: () => <span className="px-2">Key</span>,
    cell: (info) => (
      <code className="px-2 text-xs text-muted-foreground">
        {info.getValue() === "-" ? "—" : `${info.getValue()}…`}
      </code>
    ),
  }),
];

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
    label: new Date(slot.ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
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

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const setSearch = (
    patch: Partial<{ status: StatusFilter; method: string; key: string }>,
  ) =>
    navigate({
      search: (previous) => ({ ...previous, ...patch }),
      replace: true,
    });

  if (logs.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No logs yet</EmptyTitle>
          <EmptyDescription>
            The last 100 requests through the gateway show up here, including
            rejections. Send your first one:
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <GatewaySnippets hostKey={service.hostKey} />
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Tabs
            value={status}
            onValueChange={(value) =>
              setSearch({ status: value as StatusFilter })
            }
          >
            <TabsList>
              {STATUS_FILTERS.map((item) => (
                <TabsTrigger key={item.value} value={item.value}>
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Select
            value={method}
            onValueChange={(value) => setSearch({ method: value })}
          >
            <SelectTrigger className={`${controlClassName} w-28`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All methods</SelectItem>
              {methods.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={key}
            onChange={(e) => setSearch({ key: e.target.value })}
            placeholder="Filter by key prefix…"
            className={`${controlClassName} w-44`}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground tabular-nums">
            {filtered.length} of last {logs.length}
          </span>
          <Button
            variant="outline"
            className="h-8 gap-1.5"
            onClick={() => setLive((current) => !current)}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                live ? "animate-pulse bg-[#0ca30c]" : "bg-muted-foreground/40",
              )}
            />
            {live ? "Live" : "Paused"}
          </Button>
        </div>
      </div>

      {volume.length > 0 ? (
        <ChartContainer config={chartConfig} className="h-20 w-full">
          <BarChart data={volume} barCategoryGap={1}>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              interval="preserveStartEnd"
              minTickGap={80}
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
      ) : null}

      {filtered.length === 0 ? (
        <Empty className="p-6 md:p-6">
          <EmptyHeader>
            <EmptyDescription>
              No requests match these filters.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <DataTable
          table={table}
          onRowClick={(entry) => setSelected(entry)}
          getRowClassName={(row) =>
            cn(
              row.original.status >= 500 && "bg-[#d03b3b]/5",
              row.original.status >= 400 &&
                row.original.status < 500 &&
                "bg-[#ec835a]/5",
              selected && entryId(row.original) === entryId(selected)
                ? "bg-muted"
                : "hover:bg-muted/50",
            )
          }
        />
      )}

      <LogDetailSheet entry={selected} onClose={() => setSelected(null)} />
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
    <Sheet open={entry !== null} onOpenChange={(next) => (next ? null : onClose())}>
      <SheetContent side="right" className="p-4">
        {entry ? (
          <>
            <SheetHeader className="p-0">
              <SheetTitle className="flex items-center gap-2 font-mono text-sm">
                <span>{entry.method}</span>
                <span className="truncate font-normal text-muted-foreground">
                  {entry.path}
                </span>
              </SheetTitle>
              <SheetDescription>
                {new Date(entry.ts).toLocaleString()}
              </SheetDescription>
            </SheetHeader>

            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "size-2 rounded-full",
                  statusDotClassName(entry.status),
                )}
              />
              <span
                className={cn(
                  "font-mono text-lg font-medium tabular-nums",
                  statusTextClassName(entry.status),
                )}
              >
                {entry.status}
              </span>
              <span className="text-sm text-muted-foreground">
                {STATUS_TEXT[entry.status] ?? ""}
              </span>
            </div>

            <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-3 gap-y-2 border-t pt-4 text-xs">
              <dt className="text-muted-foreground">Latency</dt>
              <dd className="font-mono tabular-nums">{entry.ms} ms</dd>
              <dt className="text-muted-foreground">Key</dt>
              <dd className="font-mono">
                {entry.keyPrefix === "-" ? "No key sent" : `${entry.keyPrefix}…`}
              </dd>
              <dt className="text-muted-foreground">Method</dt>
              <dd className="font-mono">{entry.method}</dd>
              <dt className="text-muted-foreground">Path</dt>
              <dd className="break-all font-mono">{entry.path}</dd>
            </dl>

            <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
              {JSON.stringify(entry, null, 2)}
            </pre>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
