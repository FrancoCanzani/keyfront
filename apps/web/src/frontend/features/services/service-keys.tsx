import { useMemo, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { toast } from "sonner";
import { SectionHeading } from "@/components/section-heading";
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
  createKeysColumns,
  KEYS_COL_WIDTHS,
} from "@/features/services/keys/columns";
import {
  consumersQuery,
  keysQuery,
  plansQuery,
  readApiError,
} from "@/lib/gateway-queries";
import { client } from "@/lib/rpc";

const route = getRouteApi("/$orgId/services/$serviceId/keys");

type IssuedKey = { key: string };

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

  const toggleKey = useMutation({
    mutationFn: async (input: { id: string; enabled: boolean }) => {
      const res = await client.api.keys[":id"].$patch({
        param: { id: input.id },
        json: { enabled: input.enabled },
      });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Failed to update key"));
      }
      return res.json();
    },
    onSuccess: (key) => {
      toast.success(
        key.enabled ? `Key ${key.prefix} resumed` : `Key ${key.prefix} paused`,
      );
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
      toast.success(`Key ${key.prefix} revoked`);
      queryClient.invalidateQueries({ queryKey: ["keys", serviceId] });
    },
    onError: (error) => toast.error(error.message),
  });

  const columns = useMemo(
    () =>
      createKeysColumns({
        onToggle: (input) => toggleKey.mutate(input),
        onRotate: (id) => rotateKey.mutate(id),
        onRevoke: (id) => revokeKey.mutate(id),
        togglePending: toggleKey.isPending,
        rotatePending: rotateKey.isPending,
        revokePending: revokeKey.isPending,
      }),
    [
      rotateKey.isPending,
      rotateKey.mutate,
      revokeKey.isPending,
      revokeKey.mutate,
      toggleKey.isPending,
      toggleKey.mutate,
    ],
  );

  const table = useReactTable({
    data: keys,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (keys.length === 0) {
    return (
      <div className="w-full min-w-0 text-xs">
        <section className="grid gap-5">
          <SectionHeading
            title="Keys"
            description="API keys issued to consumers on this service."
          />
          <Empty className="p-4 md:p-4">
            <EmptyHeader>
              <EmptyTitle className="text-sm">No keys yet</EmptyTitle>
              <EmptyDescription className="text-xs">
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
        </section>
        <IssuedKeyDialog
          issuedKey={issuedKey}
          onClose={() => setIssuedKey(null)}
        />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 text-xs">
      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SectionHeading
            title="Keys"
            description="API keys issued to consumers on this service."
          />
          <div className="flex shrink-0 gap-2">
            <AddConsumerDialog serviceId={serviceId} />
            <IssueKeyDialog
              orgId={orgId}
              serviceId={serviceId}
              onIssued={setIssuedKey}
            />
          </div>
        </div>
        <DataTable
          variant="plain"
          size="sm"
          table={table}
          colWidths={KEYS_COL_WIDTHS}
          minWidth="52rem"
          maxHeight="none"
        />
      </section>

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
    <Dialog
      open={issuedKey !== null}
      onOpenChange={(next) => (next ? null : close())}
    >
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
        <Button variant="outline" className="h-7 shrink-0 text-xs">
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
      name: string;
      environment: "live" | "test";
    }) => {
      const res = await client.api.keys.$post({
        json: {
          ...value,
          expiresAt: value.expiresAt || null,
          name: value.name.trim() || null,
        },
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
    defaultValues: {
      consumerId: "",
      planId: "",
      expiresAt: "",
      name: "",
      environment: "live" as "live" | "test",
    },
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
        <Button className="h-7 shrink-0 text-xs">Issue key</Button>
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
            <form.Field name="name">
              {(field) => (
                <FormFieldGroup>
                  <FormFieldLabel htmlFor={field.name}>
                    Name (optional)
                  </FormFieldLabel>
                  <Input
                    id={field.name}
                    className={controlClassName}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Production"
                  />
                </FormFieldGroup>
              )}
            </form.Field>
            <div className="grid grid-cols-2 gap-4">
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
              <form.Field name="environment">
                {(field) => (
                  <FormFieldGroup>
                    <FormFieldLabel htmlFor={field.name}>
                      Environment
                    </FormFieldLabel>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) =>
                        field.handleChange(value as "live" | "test")
                      }
                    >
                      <SelectTrigger id={field.name} className={controlClassName}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="live">Live</SelectItem>
                        <SelectItem value="test">Test</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormFieldGroup>
                )}
              </form.Field>
            </div>
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
