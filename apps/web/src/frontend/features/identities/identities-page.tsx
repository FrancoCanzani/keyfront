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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardHeader } from "@/features/dashboard/dashboard-header";
import { client } from "@/lib/api";
import { DotsThreeIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { type Identity, identitiesQueryOptions } from "./queries";

const columnHelper = createColumnHelper<Identity>();

export function IdentitiesPage() {
  const query = useQuery(identitiesQueryOptions);
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Identity | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await client.api.identities[":id"].$delete({ param: { id } });
      if (!res.ok) {
        throw new Error("Failed to delete identity");
      }
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["identities"] });
      await queryClient.invalidateQueries({ queryKey: ["keys"] });
      toast.success("Identity deleted");
    },
    onError: () => toast.error("Failed to delete identity"),
    onSettled: () => setPendingDelete(null),
  });

  const columns = useMemo(
    () => [
      columnHelper.accessor("externalId", {
        header: "External ID",
        cell: (info) => (
          <code className="font-mono text-xs font-medium">
            {info.getValue()}
          </code>
        ),
      }),
      columnHelper.accessor("createdAt", {
        header: "Created",
        meta: { width: "16%" },
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
        breadcrumbs={[{ label: "Identities" }]}
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            New identity
          </Button>
        }
      />

      <div className="px-3 py-4">
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading identities...</p>
        ) : query.data && query.data.length > 0 ? (
          <DataTable table={table} />
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No identities yet</EmptyTitle>
              <EmptyDescription>
                An identity links keys to a user or org in your own system, so
                limits and usage follow them across keys.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>

      <NewIdentityDialog open={createOpen} onOpenChange={setCreateOpen} />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this identity?</AlertDialogTitle>
            <AlertDialogDescription>
              Keys linked to {pendingDelete?.externalId} keep working but lose
              the link. This can't be undone.
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

function NewIdentityDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: async (value: { externalId: string }) => {
      const res = await client.api.identities.$post({ json: value });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Failed to create identity");
      }
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["identities"] });
      toast.success("Identity created");
      onOpenChange(false);
      form.reset();
    },
    onError: (mutationError) =>
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to create identity",
      ),
  });

  const form = useForm({
    defaultValues: { externalId: "" },
    onSubmit: async ({ value }) => {
      setError("");
      await mutation.mutateAsync(value);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New identity</DialogTitle>
          <DialogDescription>
            Use the ID this user or org already has in your system, like a user
            ID or org slug.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            form.handleSubmit();
          }}
        >
          <form.Field
            name="externalId"
            validators={{
              onChange: ({ value }) =>
                value.trim()
                  ? undefined
                  : { message: "External ID is required" },
            }}
          >
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name}>External ID</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="user_1234"
                  className="w-full font-mono"
                />
              </div>
            )}
          </form.Field>

          {error ? (
            <p className="text-xs leading-5 text-destructive">{error}</p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit || isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create identity"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
