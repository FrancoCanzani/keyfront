import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { SectionHeading } from "@/components/section-heading";
import { DataTable } from "@/components/ui/data-table";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  createLogsColumns,
  entryId,
  LOGS_COL_WIDTHS,
  type LogEntry,
  type LogSortField,
} from "@/features/services/logs/columns";
import { StatusBadge } from "@/features/services/logs/status-badge";
import { GatewaySnippets } from "@/features/services/gateway-snippets";
import { logsQuery, serviceQuery } from "@/lib/gateway-queries";
import { cn } from "@/lib/utils";

const route = getRouteApi("/$orgId/services/$serviceId/logs");

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "2xx", label: "2xx" },
  { value: "4xx", label: "4xx" },
  { value: "5xx", label: "5xx" },
] as const;

const SUCCESS_GREEN = "#15803d";

const STATUS_TEXT: Record<number, string> = {
  200: "OK",
  201: "Created",
  204: "No Content",
  400: "Bad Request",
  401: "Unauthorized",
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
  "h-7 min-h-7 box-border shrink-0 py-0 text-xs leading-7";

const pillClass = cn(
  "inline-flex items-center justify-center rounded border border-border bg-muted/40 px-2.5 font-normal transition-colors hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-50",
  controlHeight,
);

const fieldClass = cn(
  "min-w-0 rounded border border-border bg-muted/40 px-2 font-data text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
  controlHeight,
);

export function ServiceLogsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl text-xs">
      <div className="grid gap-10">
        <section className="grid gap-3">
          <Skeleton className="h-4 w-72" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-7 w-10 rounded" />
            ))}
            <Skeleton className="h-7 w-28 rounded" />
            <Skeleton className="h-7 w-44 rounded" />
          </div>
        </section>
        <section className="grid gap-3">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-20 w-full rounded" />
        </section>
        <section className="grid gap-3">
          <div className="overflow-hidden rounded border border-border">
            <div className="border-b border-border px-2 py-2">
              <div className="flex gap-4">
                {LOGS_COL_WIDTHS.map((width) => (
                  <Skeleton key={width} className="h-3 flex-1" style={{ maxWidth: width }} />
                ))}
              </div>
            </div>
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="flex gap-4 border-b border-border/50 px-2 py-2 last:border-b-0"
              >
                {LOGS_COL_WIDTHS.map((width) => (
                  <Skeleton key={width} className="h-3 flex-1" style={{ maxWidth: width }} />
                ))}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export function ServiceLogsPage() {
  const { serviceId } = route.useParams();
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const { data: service } = useSuspenseQuery(serviceQuery(serviceId));
  const [selected, setSelected] = useState<LogEntry | null>(null);

  const { data } = useSuspenseQuery({
    ...logsQuery(serviceId, search),
    refetchInterval: search.page === 1 ? 5_000 : false,
  });

  const { entries, total, page, limit, methods, volume } = data;
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);

  const separatorAfter = useMemo(() => {
    for (let index = 0; index < entries.length - 1; index += 1) {
      if (entries[index].live && !entries[index + 1]?.live) return index;
    }
    return -1;
  }, [entries]);

  const setSearch = (
    patch: Partial<typeof search>,
    resetPage = patch.page === undefined,
  ) =>
    navigate({
      search: (previous) => ({
        ...previous,
        ...patch,
        ...(resetPage ? { page: 1 } : {}),
      }),
      replace: true,
    });

  const toggleSort = useCallback(
    (field: LogSortField) => {
      navigate({
        search: (previous) => ({
          ...previous,
          page: 1,
          sort: field,
          order:
            previous.sort === field && previous.order === "desc"
              ? "asc"
              : "desc",
        }),
        replace: true,
      });
    },
    [navigate],
  );

  const columns = useMemo(
    () =>
      createLogsColumns({
        sort: search.sort,
        order: search.order,
        onSort: toggleSort,
      }),
    [search.sort, search.order, toggleSort],
  );

  const table = useReactTable({
    data: entries,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (entries.length === 0) return;

      if (event.key === "Escape") {
        setSelected(null);
        return;
      }

      const currentIndex =
        selected === null
          ? -1
          : entries.findIndex(
              (entry) => entryId(entry) === entryId(selected),
            );

      if (event.key === "j" || event.key === "ArrowDown") {
        event.preventDefault();
        const nextIndex =
          currentIndex < 0 ? 0 : Math.min(currentIndex + 1, entries.length - 1);
        setSelected(entries[nextIndex]);
      }

      if (event.key === "k" || event.key === "ArrowUp") {
        event.preventDefault();
        const nextIndex =
          currentIndex < 0 ? 0 : Math.max(currentIndex - 1, 0);
        setSelected(entries[nextIndex]);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [entries, selected]);

  if (total === 0 && search.status === "all" && search.method === "all" && search.key === "") {
    return (
      <div className="mx-auto w-full max-w-4xl text-xs">
        <section className="grid gap-5">
          <SectionHeading
            title="Logs"
            description="Request history for the last 30 days."
          />
          <Empty className="p-4 md:p-4">
            <EmptyHeader>
              <EmptyTitle className="text-sm">No logs yet</EmptyTitle>
              <EmptyDescription className="text-xs">
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
    <div className="mx-auto w-full max-w-4xl text-xs">
      <div className="grid gap-10">
        <section className="grid gap-3">
          <div className="flex items-center justify-between gap-4">
            <SectionHeading
              title="Logs"
              description="Request history for the last 30 days."
            />
            <span className="shrink-0 font-data text-xs leading-snug text-muted-foreground tabular-nums">
              {rangeStart}–{rangeEnd} of {total.toLocaleString()}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1">
              {STATUS_FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={cn(
                    pillClass,
                    search.status === item.value &&
                      "border-foreground/20 bg-muted/60 text-foreground",
                  )}
                  onClick={() => setSearch({ status: item.value })}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <Select
              value={search.method}
              onValueChange={(value) => setSearch({ method: value })}
            >
              <SelectTrigger
                size="sm"
                className={cn(fieldClass, "w-28 shadow-none")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-data text-xs">
                  All methods
                </SelectItem>
                {methods.map((item) => (
                  <SelectItem key={item} value={item} className="font-data text-xs">
                    {item}
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
                  tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
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
          {entries.length === 0 ? (
            <Empty className="p-4 md:p-4">
              <EmptyHeader>
                <EmptyDescription className="text-xs">
                  No requests match these filters.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <DataTable
                variant="plain"
                size="sm"
                table={table}
                colWidths={LOGS_COL_WIDTHS}
                onRowClick={setSelected}
                separator={
                  separatorAfter >= 0
                    ? { afterIndex: separatorAfter, label: "Historical" }
                    : undefined
                }
                getRowClassName={(row) =>
                  cn(
                    "transition-opacity",
                    row.original.status >= 500 && "bg-[#d03b3b]/5",
                    row.original.status >= 400 &&
                      row.original.status < 500 &&
                      "bg-[#ec835a]/5",
                    selected &&
                      entryId(row.original) !== entryId(selected) &&
                      "opacity-50",
                    selected &&
                      entryId(row.original) === entryId(selected) &&
                      "bg-muted opacity-100",
                  )
                }
              />
              <div className="flex items-center justify-between">
                <span className="font-data text-xxs text-muted-foreground tabular-nums">
                  Page {page} of {pageCount}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className={cn(pillClass, "px-2")}
                    disabled={page <= 1}
                    onClick={() => setSearch({ page: page - 1 }, false)}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className={cn(pillClass, "px-2")}
                    disabled={page >= pageCount}
                    onClick={() => setSearch({ page: page + 1 }, false)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

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
            </SheetHeader>

            <div className="flex items-center gap-2">
              <StatusBadge status={entry.status} />
              <span className="text-xs text-muted-foreground">
                {STATUS_TEXT[entry.status] ?? ""}
              </span>
            </div>

            <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-3 gap-y-2 border-t pt-4 font-data text-xs">
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

            <pre className="overflow-x-auto rounded border border-border bg-muted/40 p-2.5 font-data text-xs leading-relaxed">
              {JSON.stringify(entry, null, 2)}
            </pre>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
