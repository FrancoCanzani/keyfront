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
import { CopyRow } from "@/components/copy-row";
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
import { DashboardHeader } from "@/features/dashboard/dashboard-header";
import { serviceQueryOptions } from "@/features/services/queries";
import { client } from "@/lib/api";
import { cn } from "@/lib/utils";
import { DotsThreeIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { IssueKeyDialog } from "./issue-key-dialog";
import { type ServiceKey, keysQueryOptions } from "./queries";

const route = getRouteApi("/dashboard/services/$serviceId/keys");

const columnHelper = createColumnHelper<ServiceKey>();

function keyEnvironment(prefix: string): "live" | "test" {
  return prefix.startsWith("kf_test_") ? "test" : "live";
}

export function ServiceKeysPage() {
  const { serviceId } = route.useParams();
  const serviceQuery = useQuery(serviceQueryOptions(serviceId));
  const keysQuery = useQuery(keysQueryOptions(serviceId));
  const queryClient = useQueryClient();

  const [issueOpen, setIssueOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<ServiceKey | null>(null);

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await client.api.keys[":id"].$delete({ param: { id } });
      if (!res.ok) {
        throw new Error("Failed to revoke key");
      }
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["keys", serviceId] });
      toast.success("Key revoked");
    },
    onError: () => toast.error("Failed to revoke key"),
    onSettled: () => setPendingRevoke(null),
  });

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Name",
        cell: (info) => (
          <span
            className={cn(
              "font-medium",
              info.row.original.revokedAt && "text-muted-foreground",
            )}
          >
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("identityExternalId", {
        header: "Identity",
        meta: { width: "14%" },
        cell: (info) => (
          <span className="truncate text-muted-foreground">
            {info.getValue() ?? "—"}
          </span>
        ),
      }),
      columnHelper.accessor("keyPrefix", {
        header: "Key",
        meta: { width: "16%" },
        cell: (info) => (
          <code className="font-mono text-xs text-muted-foreground">
            {info.getValue()}…
          </code>
        ),
      }),
      columnHelper.accessor("planName", {
        header: "Plan",
        meta: { width: "12%" },
        cell: (info) => (
          <span className="truncate text-muted-foreground">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("keyPrefix", {
        id: "environment",
        header: "Env",
        meta: { width: "9%" },
        cell: (info) => {
          const env = keyEnvironment(info.getValue());
          return (
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-xxs font-medium",
                env === "live"
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-amber-500/10 text-amber-600",
              )}
            >
              {env}
            </span>
          );
        },
      }),
      columnHelper.accessor("revokedAt", {
        header: "Status",
        meta: { width: "10%" },
        cell: (info) =>
          info.getValue() ? (
            <span className="text-muted-foreground">Revoked</span>
          ) : (
            <span>Active</span>
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
        cell: (info) =>
          info.row.original.revokedAt ? null : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7">
                  <DotsThreeIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setPendingRevoke(info.row.original)}
                >
                  Revoke
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ),
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: keysQuery.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const service = serviceQuery.data;

  return (
    <>
      <DashboardHeader
        breadcrumbs={[
          { label: "Services", href: "/dashboard" },
          {
            label: service?.name ?? "Service",
            href: `/dashboard/services/${serviceId}`,
            serviceId,
          },
          { label: "Keys" },
        ]}
        actions={
          <Button size="sm" onClick={() => setIssueOpen(true)}>
            Issue key
          </Button>
        }
      />

      <div className="px-3 py-4">
        {keysQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading keys...</p>
        ) : keysQuery.data && keysQuery.data.length > 0 ? (
          <DataTable table={table} />
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No keys yet</EmptyTitle>
              <EmptyDescription>
                Issue a key so callers can reach this service through the
                gateway.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>

      <IssueKeyDialog
        serviceId={serviceId}
        open={issueOpen}
        onOpenChange={setIssueOpen}
        onCreated={setCreatedKey}
      />

      <Dialog
        open={createdKey !== null}
        onOpenChange={(open) => !open && setCreatedKey(null)}
      >
        <DialogContent
          className="sm:max-w-md"
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Key created</DialogTitle>
            <DialogDescription>
              Copy it now. You won't be able to see it again.
            </DialogDescription>
          </DialogHeader>
          {createdKey ? <CopyRow label="API key" value={createdKey} /> : null}
          <p className="text-xs leading-5 text-muted-foreground">
            Callers send it as{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono">
              Authorization: Bearer {"<key>"}
            </code>{" "}
            on every request to https://{service?.host}.
          </p>
          <DialogFooter>
            <Button type="button" onClick={() => setCreatedKey(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingRevoke !== null}
        onOpenChange={(open) => !open && setPendingRevoke(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this key?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRevoke?.name} ({pendingRevoke?.keyPrefix}…) stops working
              immediately. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingRevoke) {
                  revokeMutation.mutate(pendingRevoke.id);
                }
              }}
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
