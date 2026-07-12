import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DashboardHeader } from "@/features/dashboard/dashboard-header";
import { client } from "@/lib/api";
import { DotsThreeIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { type Service, servicesQueryOptions } from "./queries";

const columnHelper = createColumnHelper<Service>();

export function ServicesPage() {
  const query = useQuery(servicesQueryOptions);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [pendingDelete, setPendingDelete] = useState<Service | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await client.api.services[":id"].$delete({ param: { id } });
      if (!res.ok) {
        throw new Error("Failed to delete service");
      }
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Service deleted");
    },
    onError: () => toast.error("Failed to delete service"),
    onSettled: () => setPendingDelete(null),
  });

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Name",
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor("host", {
        header: "Gateway host",
        meta: { width: "28%" },
        cell: (info) => (
          <span className="truncate text-muted-foreground">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("upstream", {
        header: "Origin",
        meta: { width: "28%" },
        cell: (info) => (
          <span className="truncate text-muted-foreground">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("createdAt", {
        header: "Created",
        meta: { width: "12%" },
        cell: (info) => (
          <span className="text-muted-foreground">
            {new Date(info.getValue()).toLocaleDateString()}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        cell: (info) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7">
                <DotsThreeIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setPendingDelete(info.row.original)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: query.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <DashboardHeader
        breadcrumbs={[{ label: "Services" }]}
        actions={
          <Button asChild size="sm">
            <Link to="/dashboard/services/new">New service</Link>
          </Button>
        }
      />

      <div className="px-3 py-4">
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading services...</p>
        ) : query.data && query.data.length > 0 ? (
          <DataTable
            table={table}
            onRowClick={(row) =>
              void navigate({
                to: "/dashboard/services/$serviceId",
                params: { serviceId: row.id },
              })
            }
          />
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No services yet</EmptyTitle>
              <EmptyDescription>
                Create your first service to put an API behind the gateway.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this service?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.host} will stop routing immediately. This can't be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) {
                  deleteMutation.mutate(pendingDelete.id);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
