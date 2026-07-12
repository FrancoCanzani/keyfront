import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardHeader } from "@/features/dashboard/dashboard-header";
import { serviceQueryOptions } from "@/features/services/queries";
import { client } from "@/lib/api";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, getRouteApi, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { createPlanSchema } from "../../../backend/routes/protected/plans/schemas";

const route = getRouteApi("/dashboard/services/$serviceId/plans/new");

export function NewPlanPage() {
  const { serviceId } = route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const serviceQuery = useQuery(serviceQueryOptions(serviceId));
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: async (value: {
      serviceId: string;
      name: string;
      rateLimit: number;
      burst: number;
      monthlyQuota: number;
    }) => {
      const res = await client.api.plans.$post({ json: value });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Failed to create plan");
      }
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["plans", serviceId] });
      toast.success("Plan created");
    },
  });

  const form = useForm({
    defaultValues: {
      serviceId,
      name: "",
      rateLimit: 10,
      burst: 20,
      monthlyQuota: 100000,
    },
    validators: {
      onMount: createPlanSchema,
      onChange: createPlanSchema,
    },
    onSubmit: async ({ value }) => {
      setError("");
      try {
        await mutation.mutateAsync(value);
        void navigate({
          to: "/dashboard/services/$serviceId/plans",
          params: { serviceId },
        });
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Failed to create plan",
        );
      }
    },
  });

  return (
    <>
      <DashboardHeader
        breadcrumbs={[
          { label: "Services", href: "/dashboard" },
          {
            label: serviceQuery.data?.name ?? "Service",
            href: `/dashboard/services/${serviceId}`,
            serviceId,
          },
          {
            label: "Plans",
            href: `/dashboard/services/${serviceId}/plans`,
          },
          { label: "New" },
        ]}
      />

      <div className="px-3 py-4">
        <div className="mx-auto max-w-lg space-y-6">
          <div>
            <h1 className="text-lg font-medium">New plan</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              A plan is a set of limits for this service. You attach it to a
              key, and the gateway enforces these limits on every request that
              key makes.
            </p>
          </div>

          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              form.handleSubmit();
            }}
          >
            <form.Field name="name">
              {(field) => (
                <Field
                  label="Name"
                  description="For your own reference, like Free, Pro, or Enterprise."
                  field={field}
                >
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={field.state.meta.isTouched && field.state.meta.errors.length > 0}
                    placeholder="Free"
                    className="w-full"
                  />
                </Field>
              )}
            </form.Field>

            <form.Field name="rateLimit">
              {(field) => (
                <Field
                  label="Rate limit"
                  description="Sustained requests per second a key can make. Steady traffic above this is rejected with 429."
                  suffix="req / sec"
                  field={field}
                >
                  <Input
                    id={field.name}
                    type="number"
                    min={0}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) =>
                      field.handleChange(numberFrom(event.target.value))
                    }
                    aria-invalid={field.state.meta.isTouched && field.state.meta.errors.length > 0}
                    className="w-full"
                  />
                </Field>
              )}
            </form.Field>

            <form.Field name="burst">
              {(field) => (
                <Field
                  label="Burst"
                  description="Headroom for short spikes. A key can fire up to this many requests at once before the per-second rate kicks in, then it refills at the rate limit above. Set it equal to the rate limit for no spike allowance."
                  suffix="requests"
                  field={field}
                >
                  <Input
                    id={field.name}
                    type="number"
                    min={0}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) =>
                      field.handleChange(numberFrom(event.target.value))
                    }
                    aria-invalid={field.state.meta.isTouched && field.state.meta.errors.length > 0}
                    className="w-full"
                  />
                </Field>
              )}
            </form.Field>

            <form.Field name="monthlyQuota">
              {(field) => (
                <Field
                  label="Monthly quota"
                  description="Total requests a key may make per calendar month. Once hit, the key is blocked until the month resets. This is what we meter for billing."
                  suffix="requests / month"
                  field={field}
                >
                  <Input
                    id={field.name}
                    type="number"
                    min={0}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) =>
                      field.handleChange(numberFrom(event.target.value))
                    }
                    aria-invalid={field.state.meta.isTouched && field.state.meta.errors.length > 0}
                    className="w-full"
                  />
                </Field>
              )}
            </form.Field>

            {error ? (
              <p className="text-xs leading-5 text-destructive">{error}</p>
            ) : null}

            <div className="flex items-center justify-end gap-2">
              <Button asChild type="button" variant="ghost">
                <Link
                  to="/dashboard/services/$serviceId/plans"
                  params={{ serviceId }}
                >
                  Cancel
                </Link>
              </Button>
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button type="submit" disabled={!canSubmit || isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create plan"}
                  </Button>
                )}
              </form.Subscribe>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

function numberFrom(value: string): number {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

type FieldApi = {
  name: string;
  state: {
    meta: {
      isTouched: boolean;
      errors: Array<{ message?: string } | undefined>;
    };
  };
};

function Field({
  label,
  description,
  suffix,
  field,
  children,
}: {
  label: string;
  description: string;
  suffix?: string;
  field: FieldApi;
  children: React.ReactNode;
}) {
  const showError =
    field.state.meta.isTouched && field.state.meta.errors.length > 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={field.name}>{label}</Label>
        {suffix ? (
          <span className="text-xs text-muted-foreground">{suffix}</span>
        ) : null}
      </div>
      {children}
      {showError ? (
        <p className="text-xs leading-5 text-destructive">
          {String(field.state.meta.errors[0]?.message ?? "")}
        </p>
      ) : (
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
