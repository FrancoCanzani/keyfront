import { useMemo, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import type { z } from "zod";
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
  controlClassName,
  FormFieldGroup,
  FormFieldLabel,
} from "@/components/form-layout";
import {
  createPlansColumns,
  PLANS_COL_WIDTHS,
} from "@/features/services/plans/columns";
import { plansQuery, readApiError } from "@/lib/gateway-queries";
import { client } from "@/lib/rpc";
import { createPlanSchema } from "../../../server/routes/protected/plans/schemas";

const route = getRouteApi("/$orgId/services/$serviceId/plans");

const planFormSchema = createPlanSchema.omit({ serviceId: true });

export function ServicePlansPage() {
  const { serviceId } = route.useParams();
  const { data: plans } = useSuspenseQuery(plansQuery(serviceId));
  const queryClient = useQueryClient();

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const res = await client.api.plans[":id"].$delete({ param: { id } });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Failed to delete plan"));
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Plan deleted");
      queryClient.invalidateQueries({ queryKey: ["plans", serviceId] });
    },
    onError: (error) => toast.error(error.message),
  });

  const columns = useMemo(
    () =>
      createPlansColumns({
        onDelete: (id) => deletePlan.mutate(id),
        deletePending: deletePlan.isPending,
      }),
    [deletePlan.isPending, deletePlan.mutate],
  );

  const table = useReactTable({
    data: plans,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (plans.length === 0) {
    return (
      <div className="mx-auto w-full max-w-4xl text-xs">
        <section className="grid gap-5">
          <SectionHeading
            title="Plans"
            description="Rate limits and quotas applied to API keys."
          />
          <Empty className="p-4 md:p-4">
            <EmptyHeader>
              <EmptyTitle className="text-sm">No plans yet</EmptyTitle>
              <EmptyDescription className="text-xs">
                A plan sets the rate limit and quota an API key gets.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <NewPlanDialog serviceId={serviceId} />
            </EmptyContent>
          </Empty>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl text-xs">
      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SectionHeading
            title="Plans"
            description="Rate limits and quotas applied to API keys."
          />
          <NewPlanDialog serviceId={serviceId} />
        </div>
        <DataTable
          variant="plain"
          size="sm"
          table={table}
          colWidths={PLANS_COL_WIDTHS}
          maxHeight="none"
        />
      </section>
    </div>
  );
}

function NewPlanDialog({ serviceId }: { serviceId: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const createPlan = useMutation({
    mutationFn: async (value: z.infer<typeof createPlanSchema>) => {
      const res = await client.api.plans.$post({ json: value });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Failed to create plan"));
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Plan created");
      close();
      queryClient.invalidateQueries({ queryKey: ["plans", serviceId] });
    },
  });

  const form = useForm({
    defaultValues: {
      name: "",
      rps: 10,
      burst: 20,
      monthlyQuota: null as number | null,
      priceCents: 0,
    },
    validators: { onSubmit: planFormSchema },
    onSubmit: async ({ value }) => {
      await createPlan.mutateAsync({ ...value, serviceId });
    },
  });

  function close() {
    setOpen(false);
    form.reset();
    createPlan.reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : close())}
    >
      <DialogTrigger asChild>
        <Button className="h-7 shrink-0 text-xs">New plan</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New plan</DialogTitle>
          <DialogDescription>
            Rate limits and quotas applied to API keys on this plan.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <form.Field name="name">
            {(field) => (
              <FormFieldGroup>
                <FormFieldLabel htmlFor={field.name}>Name</FormFieldLabel>
                <Input
                  id={field.name}
                  className={controlClassName}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Free"
                />
              </FormFieldGroup>
            )}
          </form.Field>

          <div className="grid grid-cols-2 gap-4">
            <form.Field name="rps">
              {(field) => (
                <FormFieldGroup>
                  <FormFieldLabel htmlFor={field.name}>
                    Requests per second
                  </FormFieldLabel>
                  <Input
                    id={field.name}
                    type="number"
                    className={controlClassName}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                  />
                </FormFieldGroup>
              )}
            </form.Field>
            <form.Field name="burst">
              {(field) => (
                <FormFieldGroup>
                  <FormFieldLabel htmlFor={field.name}>Burst</FormFieldLabel>
                  <Input
                    id={field.name}
                    type="number"
                    className={controlClassName}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                  />
                </FormFieldGroup>
              )}
            </form.Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <form.Field name="monthlyQuota">
              {(field) => (
                <FormFieldGroup>
                  <FormFieldLabel htmlFor={field.name}>
                    Monthly quota
                  </FormFieldLabel>
                  <Input
                    id={field.name}
                    type="number"
                    className={controlClassName}
                    value={field.state.value ?? ""}
                    onBlur={field.handleBlur}
                    onChange={(e) =>
                      field.handleChange(
                        e.target.value === "" ? null : e.target.valueAsNumber,
                      )
                    }
                    placeholder="Unlimited"
                  />
                </FormFieldGroup>
              )}
            </form.Field>
            <form.Field name="priceCents">
              {(field) => (
                <FormFieldGroup>
                  <FormFieldLabel htmlFor={field.name}>
                    Price (cents / month)
                  </FormFieldLabel>
                  <Input
                    id={field.name}
                    type="number"
                    className={controlClassName}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                  />
                </FormFieldGroup>
              )}
            </form.Field>
          </div>

          {createPlan.error ? (
            <p role="alert" className="text-xs text-destructive">
              {createPlan.error.message}
            </p>
          ) : null}

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
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  className="h-8"
                  disabled={!canSubmit || isSubmitting}
                >
                  {isSubmitting ? "Creating…" : "Create plan"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
