import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { RowData, Table as TanstackTable } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    width?: string;
  }
}

type DataTableProps<TData> = {
  table: TanstackTable<TData>;
  onRowClick?: (row: TData) => void;
  maxHeight?: string;
};

export function DataTable<TData>({
  table,
  onRowClick,
  maxHeight = "calc(100dvh - 20rem)",
}: DataTableProps<TData>) {
  const columns = table.getVisibleLeafColumns();
  const fixed = columns.some((column) => column.columnDef.meta?.width);

  return (
    <div className="overflow-hidden rounded-md border">
      <div
        className="overflow-auto"
        style={maxHeight === "none" ? undefined : { maxHeight }}
      >
        <Table className={cn("text-sm", fixed && "table-fixed")}>
          {fixed ? (
            <colgroup>
              {columns.map((column) => (
                <col
                  key={column.id}
                  style={{ width: column.columnDef.meta?.width }}
                />
              ))}
            </colgroup>
          ) : null}
          <TableHeader className="sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-0 hover:bg-transparent"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "h-9 bg-background px-3 text-xs font-medium text-muted-foreground shadow-[inset_0_-1px_0_0_var(--color-border)]",
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
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? "selected" : undefined}
                className={cn(onRowClick && "cursor-pointer")}
                onClick={
                  onRowClick ? () => onRowClick(row.original) : undefined
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    onClick={
                      cell.column.id === "actions"
                        ? (event) => event.stopPropagation()
                        : undefined
                    }
                    className={cn(
                      "px-3 py-2.5",
                      cell.column.id === "actions"
                        ? "w-10 p-0 text-center"
                        : fixed && "max-w-0 overflow-hidden",
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
