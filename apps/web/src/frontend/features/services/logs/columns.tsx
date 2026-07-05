import { createColumnHelper } from "@tanstack/react-table";
import type { InferResponseType } from "hono/client";
import { TimestampInfo } from "@/components/timestamp-info";
import { cn } from "@/lib/utils";
import type { client } from "@/lib/rpc";
import { MethodBadge } from "./method-badge";
import { StatusBadge } from "./status-badge";

export type LogEntry = InferResponseType<
  typeof client.api.logs.$get,
  200
>["entries"][number];

export type LogSortField = "ts" | "status" | "ms" | "method" | "path";
export type LogSortOrder = "asc" | "desc";

const columnHelper = createColumnHelper<LogEntry>();

function SortableHeader({
  label,
  field,
  sort,
  order,
  align = "left",
  onSort,
}: {
  label: string;
  field: LogSortField;
  sort: LogSortField;
  order: LogSortOrder;
  align?: "left" | "right";
  onSort: (field: LogSortField) => void;
}) {
  const active = sort === field;
  return (
    <button
      type="button"
      className={cn(
        "inline-flex w-full items-center gap-1 px-2 font-normal text-muted-foreground hover:text-foreground",
        align === "right" && "justify-end",
      )}
      onClick={() => onSort(field)}
    >
      <span>{label}</span>
      {active ? (
        <span className="font-data text-xxs tabular-nums">
          {order === "asc" ? "↑" : "↓"}
        </span>
      ) : null}
    </button>
  );
}

export function createLogsColumns({
  sort,
  order,
  onSort,
}: {
  sort: LogSortField;
  order: LogSortOrder;
  onSort: (field: LogSortField) => void;
}) {
  return [
    columnHelper.accessor("ts", {
      id: "ts",
      header: () => (
        <SortableHeader
          label="Time"
          field="ts"
          sort={sort}
          order={order}
          onSort={onSort}
        />
      ),
      cell: (info) => (
        <TimestampInfo
          value={info.getValue()}
          className="text-xs text-muted-foreground"
        />
      ),
      meta: { width: "15%" },
    }),
    columnHelper.accessor("status", {
      id: "status",
      header: () => (
        <SortableHeader
          label="Status"
          field="status"
          sort={sort}
          order={order}
          onSort={onSort}
        />
      ),
      cell: (info) => <StatusBadge status={info.getValue()} />,
      meta: { width: "8%" },
    }),
    columnHelper.accessor("method", {
      id: "method",
      header: () => (
        <SortableHeader
          label="Method"
          field="method"
          sort={sort}
          order={order}
          onSort={onSort}
        />
      ),
      cell: (info) => <MethodBadge method={info.getValue()} />,
      meta: { width: "8%" },
    }),
    columnHelper.accessor("path", {
      id: "path",
      header: () => (
        <SortableHeader
          label="Path"
          field="path"
          sort={sort}
          order={order}
          onSort={onSort}
        />
      ),
      cell: (info) => (
        <span
          className="block truncate font-data text-xs text-muted-foreground"
          title={info.getValue()}
        >
          {info.getValue()}
        </span>
      ),
      meta: { width: "18%" },
    }),
    columnHelper.accessor("ms", {
      id: "ms",
      header: () => (
        <SortableHeader
          label="Latency"
          field="ms"
          sort={sort}
          order={order}
          align="right"
          onSort={onSort}
        />
      ),
      cell: (info) => (
        <span className="block text-right font-data text-xs text-muted-foreground tabular-nums">
          {info.getValue()} ms
        </span>
      ),
      meta: { width: "10%" },
    }),
    columnHelper.accessor("keyPrefix", {
      id: "keyPrefix",
      header: () => <span className="px-2">Key</span>,
      cell: (info) => {
        const value = info.getValue();
        return (
          <span
            className="block truncate font-data text-xs text-muted-foreground"
            title={value === "-" ? undefined : value}
          >
            {value === "-" ? "—" : `${value}…`}
          </span>
        );
      },
      meta: { width: "41%" },
    }),
  ];
}

export const LOGS_COL_WIDTHS = ["15%", "8%", "8%", "18%", "10%", "41%"];

export const entryId = (entry: LogEntry) =>
  `${entry.ts}-${entry.method}-${entry.path}-${entry.status}-${entry.ms}`;
