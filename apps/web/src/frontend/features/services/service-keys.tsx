import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { InferResponseType } from "hono/client";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  controlClassName,
  FormFieldGroup,
  FormFieldLabel,
} from "@/components/form-layout";
import {
  consumersQuery,
  keysQuery,
  plansQuery,
  readApiError,
} from "@/lib/gateway-queries";
import { client } from "@/lib/rpc";

const route = getRouteApi("/$orgId/services/$serviceId/keys");

type ApiKeyRow = InferResponseType<typeof client.api.keys.$get, 200>[number];
type IssuedKey = { key: string };

const columnHelper = createColumnHelper<ApiKeyRow>();

export function ServiceKeysPage() {
  const { orgId, serviceId } = route.useParams();
  const { data: keys } = useSuspenseQuery(keysQuery(serviceId));
  const queryClient = useQueryClient();
  const [issuedKey, setIssuedKey] = useState<IssuedKey | null>(null);

  const rotateKey = useMutation({
    mutationFn: async (id: string) => {
      const res = await client.api.keys[":id"].rotate.$post({
        param: { id },
      });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Failed to rotate key"));
      }
      return res.json();
    },
    onSuccess: (key) => {
      setIssuedKey(key);
      queryClient.invalidateQueries({ queryKey: ["keys", serviceId] });
    },
    onError: (error) => toast.error(error.message),
  });

  const revokeKey = useMutation({
    mutationFn: async (id: string) => {
      const res = await client.api.keys[":id"].revoke.$patch({
        param: { id },
      });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Failed to revoke key"));
      }
      return res.json();
    },
    onSuccess: (key) => {
      toast.success(`Key ${key.prefix}… revoked`);
      queryClient.invalidateQueries({ queryKey: ["keys", serviceId] });
    },
    onError: (error) => toast.error(error.message),
  });

  const columns = [
    columnHelper.accessor("prefix", {
      header: () => <span className="px-2">Key</span>,
      cell: (info) => (
        <code className="px-2 font-mono text-xs tabular-nums">
          {info.getValue()}…
        </code>
      ),
    }),
    columnHelper.accessor("consumerExternalRef", {
      header: () => <span className="px-2">Consumer</span>,
      cell: (info) => (
        <span className="px-2">
          {info.getValue() ?? info.row.original.consumerId.slice(0, 8)}
        </span>
      ),
    }),
    columnHelper.accessor("planName", {
      header: () => <span className="px-2">Plan</span>,
      cell: (info) => <span className="px-2">{info.getValue()}</span>,
    }),
    columnHelper.accessor("status", {
      header: () => <span className="px-2">Status</span>,
      cell: (info) => (
        <span
          className={
            info.getValue() === "active"
              ? "px-2 text-xs font-medium text-green-700"
              : "px-2 text-xs font-medium text-muted-foreground line-through"
          }
        >
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("lastUsedAt", {
      header: () => <span className="px-2">Last used</span>,
      cell: (info) => (
        <span className="px-2 font-mono text-xs text-muted-foreground tabular-nums">
          {info.getValue()
            ? new Date(info.getValue() as string).toLocaleString()
            : "Never"}
        </span>
      ),
    }),
    columnHelper.accessor("expiresAt", {
      header: () => <span className="px-2">Expires</span>,
      cell: (info) => {
        const value = info.getValue();
        if (!value) {
          return <span className="px-2 text-xs text-muted-foreground">Never</span>;
        }
        const expired = new Date(value as string).getTime() < Date.now();
        return (
          <span
            className={
              expired
                ? "px-2 font-mono text-xs font-medium text-[#d03b3b] tabular-nums"
                : "px-2 font-mono text-xs text-muted-foreground tabular-nums"
            }
          >
            {expired ? "Expired " : ""}
            {new Date(value as string).toLocaleDateString()}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      cell: (info) =>
        info.row.original.status === "active" ? (
          <div className="flex justify-end gap-1">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" disabled={rotateKey.isPending}>
                  Rotate
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Rotate {info.row.original.prefix}…?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    A new key is issued with the same consumer, plan and
                    expiry. The old key stops working within seconds, so make
                    sure whoever uses it is ready to swap.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => rotateKey.mutate(info.row.original.id)}
                  >
                    Rotate key
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" disabled={revokeKey.isPending}>
                  Revoke
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Revoke {info.row.original.prefix}…?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Requests with this key start failing within the gateway's
                    cache TTL. This can't be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => revokeKey.mutate(info.row.original.id)}
                  >
                    Revoke key
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : null,
    }),
  ];

  const table = useReactTable({
    data: keys,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6">
      {keys.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No keys yet</EmptyTitle>
            <EmptyDescription>
              Add a consumer, then issue them a key.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex items-center gap-2">
              <AddConsumerDialog serviceId={serviceId} />
              <IssueKeyDialog
                orgId={orgId}
                serviceId={serviceId}
                onIssued={setIssuedKey}
              />
            </div>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <div className="flex items-center justify-end gap-2">
            <AddConsumerDialog serviceId={serviceId} />
            <IssueKeyDialog
              orgId={orgId}
              serviceId={serviceId}
              onIssued={setIssuedKey}
            />
          </div>
          <DataTable table={table} />
        </>
      )}

      <IssuedKeyDialog
        issuedKey={issuedKey}
        onClose={() => setIssuedKey(null)}
      />
    </div>
  );
}

function maskKey(key: string) {
  return `${key.slice(0, 12)}${"•".repeat(16)}${key.slice(-4)}`;
}

function IssuedKeyDialog({
  issuedKey,
  onClose,
}: {
  issuedKey: IssuedKey | null;
  onClose: () => void;
}) {
  const [revealed, setRevealed] = useState(false);

  function close() {
    setRevealed(false);
    onClose();
  }

  return (
    <Dialog open={issuedKey !== null} onOpenChange={(next) => (next ? null : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Key issued</DialogTitle>
          <DialogDescription>
            Copy it now. It won't be shown again.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded-lg border bg-muted/40 px-3 py-2 font-mono text-xs tabular-nums">
            {issuedKey ? (revealed ? issuedKey.key : maskKey(issuedKey.key)) : null}
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label={revealed ? "Hide key" : "Reveal key"}
            onClick={() => setRevealed((current) => !current)}
          >
            {revealed ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </Button>
          <Button
            variant="outline"
            className="h-8 shrink-0"
            onClick={() => {
              if (issuedKey) navigator.clipboard.writeText(issuedKey.key);
              toast.success("Copied to clipboard");
            }}
          >
            Copy
          </Button>
        </div>
        <DialogFooter>
          <Button className="h-8" onClick={close}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddConsumerDialog({ serviceId }: { serviceId: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const addConsumer = useMutation({
    mutationFn: async (externalRef: string) => {
      const res = await client.api.consumers.$post({
        json: { serviceId, externalRef: externalRef || null },
      });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Failed to add consumer"));
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Consumer added");
      close();
      queryClient.invalidateQueries({ queryKey: ["consumers", serviceId] });
    },
    onError: (error) => toast.error(error.message),
  });

  const form = useForm({
    defaultValues: { externalRef: "" },
    onSubmit: async ({ value }) => {
      await addConsumer.mutateAsync(value.externalRef);
    },
  });

  function close() {
    setOpen(false);
    form.reset();
    addConsumer.reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : close())}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="h-8 shrink-0">
          Add consumer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a consumer</DialogTitle>
          <DialogDescription>
            A consumer is whoever calls your API: a customer, team, or app.
            Give them a label so you can tell keys apart later.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <form.Field name="externalRef">
            {(field) => (
              <FormFieldGroup>
                <FormFieldLabel htmlFor={field.name}>Label</FormFieldLabel>
                <Input
                  id={field.name}
                  className={controlClassName}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="customer@acme.com"
                />
              </FormFieldGroup>
            )}
          </form.Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-8"
              onClick={close}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-8"
              disabled={addConsumer.isPending}
            >
              {addConsumer.isPending ? "Adding…" : "Add consumer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function IssueKeyDialog({
  orgId,
  serviceId,
  onIssued,
}: {
  orgId: string;
  serviceId: string;
  onIssued: (key: IssuedKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: consumers } = useSuspenseQuery(consumersQuery(serviceId));
  const { data: plans } = useSuspenseQuery(plansQuery(serviceId));
  const queryClient = useQueryClient();

  const issueKey = useMutation({
    mutationFn: async (value: {
      consumerId: string;
      planId: string;
      expiresAt: string;
    }) => {
      const res = await client.api.keys.$post({
        json: { ...value, expiresAt: value.expiresAt || null },
      });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Failed to issue key"));
      }
      return res.json();
    },
    onSuccess: (key) => {
      close();
      onIssued(key);
      queryClient.invalidateQueries({ queryKey: ["keys", serviceId] });
    },
    onError: (error) => toast.error(error.message),
  });

  const form = useForm({
    defaultValues: { consumerId: "", planId: "", expiresAt: "" },
    onSubmit: async ({ value }) => {
      await issueKey.mutateAsync(value);
    },
  });

  function close() {
    setOpen(false);
    form.reset();
    issueKey.reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : close())}
    >
      <DialogTrigger asChild>
        <Button className="h-8 shrink-0">Issue key</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Issue a key</DialogTitle>
          <DialogDescription>
            Pick a consumer and a plan. The plan sets rate limits and quotas
            for that key.
          </DialogDescription>
        </DialogHeader>
        {plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Create a plan first on the{" "}
            <Link
              to="/$orgId/services/$serviceId/plans"
              params={{ orgId, serviceId }}
              className="underline-offset-4 hover:underline"
            >
              Plans
            </Link>{" "}
            tab.
          </p>
        ) : consumers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add a consumer before issuing a key.
          </p>
        ) : (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <form.Field name="consumerId">
              {(field) => (
                <FormFieldGroup>
                  <FormFieldLabel htmlFor={field.name}>Consumer</FormFieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={field.handleChange}
                  >
                    <SelectTrigger id={field.name} className={controlClassName}>
                      <SelectValue placeholder="Select consumer…" />
                    </SelectTrigger>
                    <SelectContent>
                      {consumers.map((consumer) => (
                        <SelectItem key={consumer.id} value={consumer.id}>
                          {consumer.externalRef ?? consumer.id.slice(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormFieldGroup>
              )}
            </form.Field>
            <form.Field name="planId">
              {(field) => (
                <FormFieldGroup>
                  <FormFieldLabel htmlFor={field.name}>Plan</FormFieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={field.handleChange}
                  >
                    <SelectTrigger id={field.name} className={controlClassName}>
                      <SelectValue placeholder="Select plan…" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormFieldGroup>
              )}
            </form.Field>
            <form.Field name="expiresAt">
              {(field) => (
                <FormFieldGroup>
                  <FormFieldLabel htmlFor={field.name}>
                    Expires (optional)
                  </FormFieldLabel>
                  <Input
                    id={field.name}
                    type="date"
                    className={controlClassName}
                    value={field.state.value}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </FormFieldGroup>
              )}
            </form.Field>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="h-8"
                onClick={close}
              >
                Cancel
              </Button>
              <form.Subscribe
                selector={(state) => [
                  state.values.consumerId,
                  state.values.planId,
                  state.isSubmitting,
                ]}
              >
                {([consumerId, planId, isSubmitting]) => (
                  <Button
                    type="submit"
                    className="h-8"
                    disabled={!consumerId || !planId || Boolean(isSubmitting)}
                  >
                    {isSubmitting ? "Issuing…" : "Issue key"}
                  </Button>
                )}
              </form.Subscribe>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
