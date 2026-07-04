import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { InferResponseType } from "hono/client";
import type { z } from "zod";
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
import { plansQuery, readApiError } from "@/lib/gateway-queries";
import { client } from "@/lib/rpc";
import { createPlanSchema } from "../../../../../server/routes/protected/plans/schemas";

export const Route = createFileRoute("/_app/services/$serviceId/plans")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(plansQuery(params.serviceId)),
  component: PlansTab,
});

type Plan = InferResponseType<typeof client.api.plans.$get, 200>[number];

const planFormSchema = createPlanSchema.omit({ serviceId: true });

const columnHelper = createColumnHelper<Plan>();

function PlansTab() {
  const { serviceId } = Route.useParams();
  const { data: plans } = useSuspenseQuery(plansQuery(serviceId));
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
      queryClient.invalidateQueries({ queryKey: ["plans", serviceId] });
    },
  });

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

  const columns = [
    columnHelper.accessor("name", {
      header: () => <span className="px-2">Name</span>,
      cell: (info) => <span className="px-2 font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor("rps", {
      header: () => <span className="px-2">RPS</span>,
      cell: (info) => <span className="px-2">{info.getValue()}</span>,
    }),
    columnHelper.accessor("burst", {
      header: () => <span className="px-2">Burst</span>,
      cell: (info) => <span className="px-2">{info.getValue()}</span>,
    }),
    columnHelper.accessor("monthlyQuota", {
      header: () => <span className="px-2">Monthly quota</span>,
      cell: (info) => (
        <span className="px-2">
          {info.getValue()?.toLocaleString() ?? "Unlimited"}
        </span>
      ),
    }),
    columnHelper.accessor("priceCents", {
      header: () => <span className="px-2">Price</span>,
      cell: (info) => (
        <span className="px-2">{`$${(info.getValue() / 100).toFixed(2)}/mo`}</span>
      ),
    }),
    columnHelper.display({
      id: "actions",
      cell: (info) => (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={deletePlan.isPending}>
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete plan "{info.row.original.name}"?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Plans with live API keys can't be deleted — revoke their keys
                first.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletePlan.mutate(info.row.original.id)}
              >
                Delete plan
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ),
    }),
  ];

  const table = useReactTable({
    data: plans,
    columns,
    getCoreRowModel: getCoreRowModel(),
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
    onSubmit: async ({ value, formApi }) => {
      await createPlan.mutateAsync({ ...value, serviceId });
      formApi.reset();
    },
  });

  return (
    <div className="space-y-6">
      {plans.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No plans yet. A plan sets the rate limit and quota an API key gets.
        </div>
      ) : (
        <DataTable table={table} />
      )}

      <section className="max-w-lg space-y-4 rounded-md border p-4">
        <h2 className="text-sm font-medium">New plan</h2>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <form.Field name="name">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name}>Name</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Free"
                />
              </div>
            )}
          </form.Field>

          <div className="grid grid-cols-2 gap-4">
            <form.Field name="rps">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Requests per second</Label>
                  <Input
                    id={field.name}
                    type="number"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="burst">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Burst</Label>
                  <Input
                    id={field.name}
                    type="number"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                  />
                </div>
              )}
            </form.Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <form.Field name="monthlyQuota">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Monthly quota</Label>
                  <Input
                    id={field.name}
                    type="number"
                    value={field.state.value ?? ""}
                    onBlur={field.handleBlur}
                    onChange={(e) =>
                      field.handleChange(
                        e.target.value === "" ? null : e.target.valueAsNumber,
                      )
                    }
                    placeholder="Unlimited"
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="priceCents">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Price (cents / month)</Label>
                  <Input
                    id={field.name}
                    type="number"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                  />
                </div>
              )}
            </form.Field>
          </div>

          {createPlan.error ? (
            <p className="text-sm text-destructive">
              {createPlan.error.message}
            </p>
          ) : null}

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <Button type="submit" disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? "Creating…" : "Create plan"}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </section>
    </div>
  );
}
