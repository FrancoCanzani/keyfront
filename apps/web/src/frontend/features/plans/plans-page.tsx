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
import { Link } from "@tanstack/react-router";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { type Plan, plansQueryOptions } from "./queries";

const columnHelper = createColumnHelper<Plan>();

export function PlansPage() {
  const query = useQuery(plansQueryOptions);
  const queryClient = useQueryClient();

  const [pendingDelete, setPendingDelete] = useState<Plan | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await client.api.plans[":id"].$delete({ param: { id } });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Failed to delete plan");
      }
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Plan deleted");
    },
    onError: (mutationError) =>
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to delete plan",
      ),
    onSettled: () => setPendingDelete(null),
  });

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Name",
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor("rateLimit", {
        header: "Rate limit",
        cell: (info) => (
          <span className="text-muted-foreground">{info.getValue()}/s</span>
        ),
      }),
      columnHelper.accessor("burst", {
        header: "Burst",
        cell: (info) => (
          <span className="text-muted-foreground">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("monthlyQuota", {
        header: "Monthly quota",
        cell: (info) => (
          <span className="text-muted-foreground">
            {info.getValue().toLocaleString()}
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
        breadcrumbs={[{ label: "Plans" }]}
        actions={
          <Button asChild size="sm">
            <Link to="/dashboard/plans/new">New plan</Link>
          </Button>
        }
      />

      <div className="px-3 py-4">
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading plans...</p>
        ) : query.data && query.data.length > 0 ? (
          <DataTable table={table} colWidths={["34%", "20%", "18%", "24%", "4%"]} />
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No plans yet</EmptyTitle>
              <EmptyDescription>
                Create a plan to set the limits your keys run under.
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
            <AlertDialogTitle>Delete this plan?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.name} will be removed. Keys using it must be moved
              first.
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
