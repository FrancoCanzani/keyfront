import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Row, Table as TanstackTable } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import type { ReactNode } from "react";
import { Fragment } from "react";

type RowSeparator = {
  afterIndex: number;
  label: string;
};

type DataTableProps<TData> = {
  table: TanstackTable<TData>;
  onRowClick?: (row: TData) => void;
  getRowClassName?: (row: Row<TData>) => string | undefined;
  variant?: "default" | "plain";
  size?: "default" | "sm";
  colWidths?: string[];
  fixedLayout?: boolean;
  minWidth?: string;
  maxHeight?: string;
  footer?: ReactNode;
  separator?: RowSeparator;
};

export function DataTable<TData>({
  table,
  onRowClick,
  getRowClassName,
  variant = "default",
  size = "default",
  colWidths,
  fixedLayout = true,
  minWidth,
  maxHeight = "calc(100dvh - 20rem)",
  footer,
  separator,
}: DataTableProps<TData>) {
  const rows = table.getRowModel().rows;
  const plain = variant === "plain";
  const sm = size === "sm";
  const useFixedLayout = fixedLayout && Boolean(colWidths);

  const tableEl = (
    <Table
      className={cn(
        plain
          ? cn(
              useFixedLayout ? "table-fixed" : "table-auto",
              "w-full bg-background",
            )
          : "bg-background rounded-lg",
        sm ? "text-xs" : "text-sm",
      )}
      style={minWidth ? { minWidth } : undefined}
    >
      {colWidths ? (
        <colgroup>
          {colWidths.map((width, index) => (
            <col key={index} style={{ width }} />
          ))}
        </colgroup>
      ) : null}
      <TableHeader
        className={cn(
          "sticky top-0 z-10 bg-background",
          plain ? "[&_tr]:border-b [&_tr]:border-border" : "[&_tr]:border-0",
        )}
      >
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow
            key={headerGroup.id}
            className="border-0 hover:bg-transparent"
          >
            {headerGroup.headers.map((header) => (
              <TableHead
                key={header.id}
                className={cn(
                  "p-0 text-left align-middle font-normal text-muted-foreground",
                  sm ? "h-8 text-xs" : "h-9 text-sm",
                  header.column.id === "select" && "w-8",
                  header.column.id === "actions" && "w-10",
                )}
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody className={cn(plain && "[&_tr]:border-0")}>
        {rows.map((row, index) => (
          <Fragment key={row.id}>
            <TableRow
              data-state={row.getIsSelected() ? "selected" : undefined}
              className={cn(
                plain ? "border-0" : "border-0 data-[state=selected]:bg-muted/50",
                !plain && "border-b border-dashed border-border/50 last:border-b-0",
                onRowClick && "cursor-pointer",
                getRowClassName?.(row),
              )}
              onClick={
                onRowClick ? () => onRowClick(row.original) : undefined
              }
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={cn(
                    "px-2 align-middle",
                    sm ? "py-1.5" : "py-2",
                    cell.column.id === "select" && "w-8 p-0",
                    cell.column.id === "actions" && "w-10 shrink-0 p-0",
                    useFixedLayout &&
                      cell.column.id !== "actions" &&
                      cell.column.id !== "select" &&
                      "max-w-0 overflow-hidden",
                  )}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
            {separator && index === separator.afterIndex ? (
              <TableRow
                key={`${row.id}-separator`}
                className="border-0 hover:bg-transparent"
              >
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className={cn(
                    "px-2 py-1.5 text-xxs text-muted-foreground",
                    sm && "text-xxs",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="h-px flex-1 bg-border" />
                    <span>{separator.label}</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                </TableCell>
              </TableRow>
            ) : null}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  );

  if (plain) {
    return (
      <div className="overflow-hidden rounded border border-border">
        <div
          className="overflow-x-auto"
          style={maxHeight === "none" ? undefined : { maxHeight }}
        >
          {tableEl}
        </div>
        {footer}
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-muted/50 p-1">
      <div
        className="overflow-auto rounded-lg [&_[data-slot=table-container]]:overflow-visible"
        style={maxHeight === "none" ? undefined : { maxHeight }}
      >
        {tableEl}
      </div>
      {footer}
    </div>
  );
}
