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

type DataTableProps<TData> = {
  table: TanstackTable<TData>;
  onRowClick?: (row: TData) => void;
  getRowClassName?: (row: Row<TData>) => string | undefined;
};

export function DataTable<TData>({
  table,
  onRowClick,
  getRowClassName,
}: DataTableProps<TData>) {
  const rows = table.getRowModel().rows;

  return (
    <div className="overflow-hidden bg-muted/50 rounded-xl p-1">
      <Table className="bg-background rounded-lg">
        <TableHeader className="[&_tr]:border-0">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="border-0 hover:bg-transparent"
            >
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    "border-b border-border/50 p-0 text-left align-middle text-xs font-normal text-muted-foreground last:border-r-0",
                    header.column.id === "select" && "w-8",
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
        <TableBody className="[&_tr]:border-0">
          {rows.map((row, rowIndex) => {
            const isLastRow = rowIndex === rows.length - 1;

            return (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? "selected" : undefined}
                className={cn(
                  "border-0 data-[state=selected]:bg-muted/50",
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
                      "h-10 border-b border-dashed border-border/50 py-0 text-xs px-2 align-middle",
                      isLastRow && "border-b-0",
                      cell.column.id === "select" && "w-8 p-0",
                      cell.column.id === "actions" && "p-0 text-center",
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
