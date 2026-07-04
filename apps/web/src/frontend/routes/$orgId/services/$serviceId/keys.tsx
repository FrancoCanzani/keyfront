import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
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
  FormSection,
} from "@/components/form-layout";
import {
  consumersQuery,
  keysQuery,
  plansQuery,
  readApiError,
} from "@/lib/gateway-queries";
import { client } from "@/lib/rpc";

export const Route = createFileRoute("/$orgId/services/$serviceId/keys")({
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
  const { orgId, serviceId } = Route.useParams();
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

  const canIssueKey = consumers.length > 0 && plans.length > 0;

  return (
    <div className="space-y-10">
      {issuedKey ? (
        <div className="space-y-3 rounded-lg border border-green-700/40 bg-green-50 p-4 dark:bg-green-950/20">
          <p className="text-sm font-medium">
            Key issued — copy it now, it won't be shown again
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg border bg-background px-3 py-2 font-mono text-xs tabular-nums">
              {issuedKey.key}
            </code>
            <Button
              variant="outline"
              className="h-8 shrink-0"
              onClick={() => {
                navigator.clipboard.writeText(issuedKey.key);
                toast.success("Copied to clipboard");
              }}
            >
              Copy
            </Button>
            <Button
              variant="outline"
              className="h-8 shrink-0"
              onClick={() => setIssuedKey(null)}
            >
              Done
            </Button>
          </div>
        </div>
      ) : null}

      <FormSection
        title="Add a consumer"
        description="A consumer is whoever calls your API — a customer, team, or app. Give them a label so you can tell keys apart later."
      >
        <form
          className="max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            consumerForm.handleSubmit();
          }}
        >
          <consumerForm.Field name="externalRef">
            {(field) => (
              <FormFieldGroup>
                <FormFieldLabel htmlFor={field.name}>Label</FormFieldLabel>
                <div className="flex gap-2">
                  <Input
                    id={field.name}
                    className={controlClassName}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="customer@acme.com"
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    className="h-8 shrink-0 px-3"
                    disabled={addConsumer.isPending}
                  >
                    Add consumer
                  </Button>
                </div>
              </FormFieldGroup>
            )}
          </consumerForm.Field>
        </form>
      </FormSection>

      <FormSection
        title="Issue a key"
        description="Pick a consumer and a plan. The plan sets rate limits and quotas for that key."
        className="border-t pt-8"
      >
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
            Add a consumer above before issuing a key.
          </p>
        ) : (
          <form
            className="flex max-w-xl flex-col gap-4 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              keyForm.handleSubmit();
            }}
          >
            <keyForm.Field name="consumerId">
              {(field) => (
                <FormFieldGroup className="min-w-0 flex-1">
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
            </keyForm.Field>
            <keyForm.Field name="planId">
              {(field) => (
                <FormFieldGroup className="min-w-0 flex-1 sm:max-w-44">
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
                  className="h-8 shrink-0 sm:mb-0"
                  disabled={
                    !canIssueKey || !consumerId || !planId || Boolean(isSubmitting)
                  }
                >
                  Issue key
                </Button>
              )}
            </keyForm.Subscribe>
          </form>
        )}
      </FormSection>

      <FormSection
        title="Active keys"
        description="All keys issued for this service."
        className="border-t pt-8"
      >
        {keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No keys yet.
          </p>
        ) : (
          <DataTable table={table} />
        )}
      </FormSection>
    </div>
  );
}
