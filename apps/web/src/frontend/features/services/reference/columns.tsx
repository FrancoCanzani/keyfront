import { createColumnHelper } from "@tanstack/react-table";
import type { InferResponseType } from "hono/client";
import { cn } from "@/lib/utils";
import type { client } from "@/lib/rpc";
import { MethodBadge } from "../logs/method-badge";

export type SpecOperation = InferResponseType<
  typeof client.api.specs.$get,
  200
>["operations"][number];

const columnHelper = createColumnHelper<SpecOperation>();

function Header({ label }: { label: string }) {
  return <span className="px-2">{label}</span>;
}

export const referenceColumns = [
  columnHelper.accessor("method", {
    header: () => <Header label="Method" />,
    cell: (info) => <MethodBadge method={info.getValue()} />,
  }),
  columnHelper.accessor("pathTemplate", {
    header: () => <Header label="Path" />,
    cell: (info) => (
      <span
        className={cn(
          "font-data text-foreground",
          info.row.original.deprecated
            ? "text-muted-foreground line-through"
            : null,
        )}
      >
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("summary", {
    header: () => <Header label="Summary" />,
    cell: (info) => (
      <span className="block truncate text-muted-foreground">
        {info.getValue() ?? "—"}
      </span>
    ),
  }),
];

export const REFERENCE_COL_WIDTHS = ["12%", "40%", "48%"];
