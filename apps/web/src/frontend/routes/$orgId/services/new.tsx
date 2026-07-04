import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { z } from "zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { gatewayDomain, readApiError } from "@/lib/gateway-queries";
import { client } from "@/lib/rpc";
import {
  createServiceSchema,
  hostKeySchema,
} from "../../../../server/routes/protected/services/schemas";

export const Route = createFileRoute("/$orgId/services/new")({
  component: NewServicePage,
});

type CreateService = z.infer<typeof createServiceSchema>;

function suggestHostKey(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function FieldErrors({ errors }: { errors: unknown[] }) {
  if (errors.length === 0) return null;
  return (
    <p className="text-xs text-destructive">
      {errors
        .map((e) =>
          typeof e === "string" ? e : ((e as { message?: string })?.message ?? ""),
        )
        .join(", ")}
    </p>
  );
}

function NewServicePage() {
  const { orgId } = Route.useParams();
  const queryClient = useQueryClient();
  const navigate = Route.useNavigate();

  const createService = useMutation({
    mutationFn: async (value: CreateService) => {
      const res = await client.api.services.$post({ json: value });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Failed to create service"));
      }
      return res.json();
    },
    onSuccess: async (service) => {
      toast.success("Service created");
      await queryClient.invalidateQueries({ queryKey: ["services"] });
      navigate({
        to: "/$orgId/services/$serviceId",
        params: { orgId, serviceId: service.id },
      });
    },
  });

  const form = useForm({
    defaultValues: { name: "", hostKey: "", originUrl: "" },
    validators: { onSubmit: createServiceSchema },
    onSubmit: ({ value }) => createService.mutateAsync(value),
  });

  return (
    <>
      <PageHeader title="New service" />
      <div className="min-w-0 flex-1 p-4 sm:p-6">
        <div className="max-w-lg space-y-6">
          <p className="text-sm text-muted-foreground">
            Point a subdomain of the gateway at your API's origin.
          </p>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <form.Field
              name="name"
              listeners={{
                onChange: ({ value }) => {
                  if (!form.state.fieldMeta.hostKey?.isDirty) {
                    form.setFieldValue("hostKey", suggestHostKey(value), {
                      dontUpdateMeta: true,
                    });
                  }
                },
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Name</Label>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Acme API"
                  />
                  <FieldErrors errors={field.state.meta.errors} />
                </div>
              )}
            </form.Field>

            <form.Field
              name="hostKey"
              asyncDebounceMs={400}
              validators={{
                onChangeAsync: async ({ value }) => {
                  if (!hostKeySchema.safeParse(value).success) return undefined;
                  const res = await client.api.services.availability.$get({
                    query: { hostKey: value },
                  });
                  if (!res.ok) return undefined;
                  const { available } = await res.json();
                  return available ? undefined : "This host key is already taken";
                },
              }}
            >
              {(field) => {
                const wellFormed = hostKeySchema.safeParse(field.state.value).success;
                return (
                  <div className="space-y-1.5">
                    <Label htmlFor={field.name}>Host key</Label>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="acme"
                    />
                    <p className="text-xs text-muted-foreground">
                      Consumers will call{" "}
                      <code className="font-mono tabular-nums">{`${field.state.value || "acme"}.${gatewayDomain}`}</code>
                      . Cannot be changed later.
                    </p>
                    {field.state.meta.isValidating ? (
                      <p className="text-xs text-muted-foreground">
                        Checking availability…
                      </p>
                    ) : wellFormed && field.state.meta.errors.length === 0 ? (
                      <p className="text-xs text-green-700">Available</p>
                    ) : null}
                    <FieldErrors errors={field.state.meta.errors} />
                  </div>
                );
              }}
            </form.Field>

            <form.Field name="originUrl">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Origin URL</Label>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="https://api.acme.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Where the gateway forwards authenticated traffic.
                  </p>
                  <FieldErrors errors={field.state.meta.errors} />
                </div>
              )}
            </form.Field>

            {createService.error ? (
              <p className="text-sm text-destructive">
                {createService.error.message}
              </p>
            ) : null}

            <div className="flex items-center gap-2">
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button type="submit" disabled={!canSubmit || isSubmitting}>
                    {isSubmitting ? "Creating…" : "Create service"}
                  </Button>
                )}
              </form.Subscribe>
              <Button variant="outline" asChild>
                <Link to="/$orgId/services" params={{ orgId }}>
                  Cancel
                </Link>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
