import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { InferResponseType } from "hono/client";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { controlClassName } from "@/components/form-layout";
import { GatewaySnippets } from "@/features/services/gateway-snippets";
import { logsQuery, serviceQuery } from "@/lib/gateway-queries";
import type { client } from "@/lib/rpc";

const route = getRouteApi("/$orgId/services/$serviceId/logs");

type LogEntry = InferResponseType<typeof client.api.logs.$get, 200>[number];

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "2xx", label: "2xx" },
  { value: "4xx", label: "4xx" },
  { value: "5xx", label: "5xx" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];

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

const statusClassName = (status: number) =>
  status >= 500
    ? "text-[#d03b3b]"
    : status >= 400
      ? "text-[#ec835a]"
      : "text-[#0ca30c]";

const columnHelper = createColumnHelper<LogEntry>();

const columns = [
  columnHelper.accessor("ts", {
    header: () => <span className="px-2">Time</span>,
    cell: (info) => (
      <span className="px-2 font-mono text-xs text-muted-foreground tabular-nums">
        {new Date(info.getValue()).toLocaleTimeString()}
      </span>
    ),
  }),
  columnHelper.accessor("method", {
    header: () => <span className="px-2">Method</span>,
    cell: (info) => <code className="px-2 text-xs">{info.getValue()}</code>,
  }),
  columnHelper.accessor("path", {
    header: () => <span className="px-2">Path</span>,
    cell: (info) => (
      <code className="block max-w-56 truncate px-2 text-xs">
        {info.getValue()}
      </code>
    ),
  }),
  columnHelper.accessor("status", {
    header: () => <span className="px-2">Status</span>,
    cell: (info) => (
      <span
        className={`px-2 font-mono text-xs font-medium tabular-nums ${statusClassName(info.getValue())}`}
      >
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("ms", {
    header: () => <span className="px-2">Latency</span>,
    cell: (info) => (
      <span className="px-2 font-mono text-xs text-muted-foreground tabular-nums">
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

export function ServiceLogsPage() {
  const { serviceId } = route.useParams();
  const { status, method, key } = route.useSearch();
  const navigate = route.useNavigate();
  const { data: service } = useSuspenseQuery(serviceQuery(serviceId));
  const { data: logs } = useSuspenseQuery(logsQuery(serviceId));

  const methods = [...new Set(logs.map((entry) => entry.method))].sort();
  const filtered = logs.filter(
    (entry) =>
      matchesStatus(entry.status, status) &&
      (method === "all" || entry.method === method) &&
      (key === "" || entry.keyPrefix.startsWith(key)),
  );

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const setSearch = (patch: Partial<{ status: StatusFilter; method: string; key: string }>) =>
    navigate({ search: (previous) => ({ ...previous, ...patch }), replace: true });

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
            onValueChange={(value) => setSearch({ status: value as StatusFilter })}
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
        <span className="text-xs text-muted-foreground">
          {filtered.length} of last {logs.length} · includes gateway rejections
          · live
        </span>
      </div>

      {filtered.length === 0 ? (
        <Empty className="p-6 md:p-6">
          <EmptyHeader>
            <EmptyDescription>
              No requests match these filters.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <DataTable table={table} />
      )}
    </div>
  );
}
