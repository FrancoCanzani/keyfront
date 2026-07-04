import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { InferResponseType } from "hono/client";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  consumersQuery,
  keysQuery,
  plansQuery,
  readApiError,
} from "@/lib/gateway-queries";
import { client } from "@/lib/rpc";

export const Route = createFileRoute("/_app/services/$serviceId/keys")({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(consumersQuery(params.serviceId)),
      context.queryClient.ensureQueryData(plansQuery(params.serviceId)),
      context.queryClient.ensureQueryData(keysQuery(params.serviceId)),
    ]),
  component: KeysTab,
});

type ApiKeyRow = InferResponseType<typeof client.api.keys.$get, 200>[number];
type IssuedKey = InferResponseType<typeof client.api.keys.$post, 201>;

const columnHelper = createColumnHelper<ApiKeyRow>();

function KeysTab() {
  const { serviceId } = Route.useParams();
  const { data: consumers } = useSuspenseQuery(consumersQuery(serviceId));
  const { data: plans } = useSuspenseQuery(plansQuery(serviceId));
  const { data: keys } = useSuspenseQuery(keysQuery(serviceId));
  const queryClient = useQueryClient();
  const [issuedKey, setIssuedKey] = useState<IssuedKey | null>(null);

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
      queryClient.invalidateQueries({ queryKey: ["consumers", serviceId] });
    },
    onError: (error) => toast.error(error.message),
  });

  const issueKey = useMutation({
    mutationFn: async (value: { consumerId: string; planId: string }) => {
      const res = await client.api.keys.$post({ json: value });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Failed to issue key"));
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

  const consumerForm = useForm({
    defaultValues: { externalRef: "" },
    onSubmit: async ({ value, formApi }) => {
      await addConsumer.mutateAsync(value.externalRef);
      formApi.reset();
    },
  });

  const keyForm = useForm({
    defaultValues: { consumerId: "", planId: "" },
    onSubmit: async ({ value, formApi }) => {
      await issueKey.mutateAsync(value);
      formApi.reset();
    },
  });

  const columns = [
    columnHelper.accessor("prefix", {
      header: () => <span className="px-2">Key</span>,
      cell: (info) => (
        <code className="px-2 text-xs">{info.getValue()}…</code>
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
        <span className="px-2 text-muted-foreground">
          {info.getValue()
            ? new Date(info.getValue() as string).toLocaleString()
            : "Never"}
        </span>
      ),
    }),
    columnHelper.display({
      id: "actions",
      cell: (info) =>
        info.row.original.status === "active" ? (
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
      {issuedKey ? (
        <div className="space-y-2 rounded-md border border-green-700/40 bg-green-50 p-4 dark:bg-green-950/20">
          <p className="text-sm font-medium">
            Key issued — copy it now, it won't be shown again
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-md border bg-background px-3 py-2 text-xs">
              {issuedKey.key}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(issuedKey.key);
                toast.success("Copied to clipboard");
              }}
            >
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIssuedKey(null)}
            >
              Done
            </Button>
          </div>
        </div>
      ) : null}

      <section className="flex flex-wrap items-end gap-4 rounded-md border p-4">
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            consumerForm.handleSubmit();
          }}
        >
          <consumerForm.Field name="externalRef">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name}>New consumer</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="customer@acme.com"
                  className="w-56"
                />
              </div>
            )}
          </consumerForm.Field>
          <Button
            type="submit"
            variant="outline"
            disabled={addConsumer.isPending}
          >
            Add
          </Button>
        </form>

        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            keyForm.handleSubmit();
          }}
        >
          <keyForm.Field name="consumerId">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name}>Consumer</Label>
                <Select
                  value={field.state.value}
                  onValueChange={field.handleChange}
                >
                  <SelectTrigger id={field.name} className="w-44">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {consumers.map((consumer) => (
                      <SelectItem key={consumer.id} value={consumer.id}>
                        {consumer.externalRef ?? consumer.id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </keyForm.Field>
          <keyForm.Field name="planId">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name}>Plan</Label>
                <Select
                  value={field.state.value}
                  onValueChange={field.handleChange}
                >
                  <SelectTrigger id={field.name} className="w-36">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </keyForm.Field>
          <keyForm.Subscribe
            selector={(state) => [
              state.values.consumerId,
              state.values.planId,
              state.isSubmitting,
            ]}
          >
            {([consumerId, planId, isSubmitting]) => (
              <Button
                type="submit"
                disabled={!consumerId || !planId || Boolean(isSubmitting)}
              >
                Issue key
              </Button>
            )}
          </keyForm.Subscribe>
        </form>
      </section>

      {keys.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No keys yet. Add a consumer, pick a plan and issue their key.
        </div>
      ) : (
        <DataTable table={table} />
      )}
    </div>
  );
}
