import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardHeader } from "@/features/dashboard/dashboard-header";
import { plansQueryOptions } from "@/features/plans/queries";
import { client } from "@/lib/api";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { createServiceSchema } from "../../../backend/routes/protected/services/schemas";
import { ServiceSecretDialog } from "./service-secret-dialog";

type CreatedService = { host: string; upstream: string; secret: string };

export function NewServicePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const plansQuery = useQuery(plansQueryOptions);
  const plans = plansQuery.data ?? [];

  const [error, setError] = useState("");
  const [createdService, setCreatedService] = useState<CreatedService | null>(
    null,
  );

  const mutation = useMutation({
    mutationFn: async (value: {
      name: string;
      label: string;
      upstream: string;
      defaultPlanId: string;
    }) => {
      const res = await client.api.services.$post({ json: value });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Failed to create service");
      }
      return res.json();
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["services"] });
      setCreatedService({
        host: data.service.host,
        upstream: data.service.upstream,
        secret: data.secret,
      });
    },
  });

  const form = useForm({
    defaultValues: { name: "", label: "", upstream: "", defaultPlanId: "" },
    validators: {
      onMount: createServiceSchema,
      onChange: createServiceSchema,
    },
    onSubmit: async ({ value }) => {
      setError("");
      try {
        await mutation.mutateAsync(value);
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Failed to create service",
        );
      }
    },
  });

  return (
    <>
      <DashboardHeader
        breadcrumbs={[
          { label: "Services", href: "/dashboard/services" },
          { label: "New" },
        ]}
      />

      <div className="px-3 py-4">
        <div className="mx-auto max-w-lg space-y-6">
          <div>
            <h1 className="text-lg font-medium">New service</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              A service points a public gateway hostname at your real API.
              Callers hit the gateway; we authenticate and rate limit them, then
              forward to your origin.
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
                  description="For your own reference, like Orders API."
                  field={field}
                >
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={field.state.meta.isTouched && field.state.meta.errors.length > 0}
                    placeholder="Orders API"
                    className="w-full"
                  />
                </Field>
              )}
            </form.Field>

            <form.Field name="label">
              {(field) => (
                <Field
                  label="Gateway subdomain"
                  description={
                    field.state.value
                      ? `Callers will reach this API at ${field.state.value}.gw.keyfront.com`
                      : "The public hostname callers use. Lowercase letters, numbers, and hyphens."
                  }
                  field={field}
                >
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={field.state.meta.isTouched && field.state.meta.errors.length > 0}
                    placeholder="acme"
                    className="w-full"
                  />
                </Field>
              )}
            </form.Field>

            <form.Field name="upstream">
              {(field) => (
                <Field
                  label="Origin URL"
                  description="Your real API. We forward requests here after auth and rate limiting. Include the scheme, like https://."
                  field={field}
                >
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={field.state.meta.isTouched && field.state.meta.errors.length > 0}
                    placeholder="https://api.acme.com"
                    className="w-full"
                  />
                </Field>
              )}
            </form.Field>

            <form.Field name="defaultPlanId">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Default plan</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={field.handleChange}
                    disabled={plans.length === 0}
                  >
                    <SelectTrigger id={field.name} className="w-full">
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {plans.length === 0 ? (
                    <p className="text-xs leading-5 text-muted-foreground">
                      You need a plan before creating a service.{" "}
                      <Link to="/dashboard/plans/new" className="underline">
                        Create a plan first
                      </Link>
                    </p>
                  ) : (
                    <p className="text-xs leading-5 text-muted-foreground">
                      New keys for this service start on this plan. You can
                      change it per key later.
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            {error ? (
              <p className="text-xs leading-5 text-destructive">{error}</p>
            ) : null}

            <div className="flex items-center justify-end gap-2">
              <Button asChild type="button" variant="ghost">
                <Link to="/dashboard/services">Cancel</Link>
              </Button>
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button type="submit" disabled={!canSubmit || isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create service"}
                  </Button>
                )}
              </form.Subscribe>
            </div>
          </form>
        </div>
      </div>

      <ServiceSecretDialog
        service={createdService}
        onClose={() => {
          setCreatedService(null);
          void navigate({ to: "/dashboard/services" });
        }}
      />
    </>
  );
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
  field,
  children,
}: {
  label: string;
  description: string;
  field: FieldApi;
  children: React.ReactNode;
}) {
  const showError =
    field.state.meta.isTouched && field.state.meta.errors.length > 0;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.name}>{label}</Label>
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
