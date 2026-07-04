import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
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
import { Input } from "@/components/ui/input";
import {
  controlClassName,
  fieldA11y,
  fieldErrors,
  FormFieldError,
  FormFieldGroup,
  FormFieldHint,
  FormFieldLabel,
  FormSection,
} from "@/components/form-layout";
import { gatewayDomain, readApiError, serviceQuery } from "@/lib/gateway-queries";
import { client } from "@/lib/rpc";
import { createServiceSchema } from "../../../server/routes/protected/services/schemas";

const route = getRouteApi("/$orgId/services/$serviceId/settings");

const settingsSchema = createServiceSchema.pick({
  name: true,
  originUrl: true,
});

type UpdateService = z.infer<typeof settingsSchema>;

export function ServiceSettingsPage() {
  const { orgId, serviceId } = route.useParams();
  const { data: service } = useSuspenseQuery(serviceQuery(serviceId));
  const queryClient = useQueryClient();
  const navigate = route.useNavigate();

  const updateService = useMutation({
    mutationFn: async (value: UpdateService) => {
      const res = await client.api.services[":id"].$patch({
        param: { id: serviceId },
        json: value,
      });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Failed to update service"));
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Service updated");
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["services", serviceId] });
    },
  });

  const deleteService = useMutation({
    mutationFn: async () => {
      const res = await client.api.services[":id"].$delete({
        param: { id: serviceId },
      });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Failed to delete service"));
      }
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["services"] });
      navigate({ to: "/$orgId/services", params: { orgId } });
    },
  });

  const form = useForm({
    defaultValues: { name: service.name, originUrl: service.originUrl },
    validators: { onBlur: settingsSchema, onSubmit: settingsSchema },
    onSubmit: ({ value }) => updateService.mutateAsync(value),
  });

  return (
    <div className="max-w-2xl space-y-8">
      <FormSection
        title="General"
        description="Name and origin routing for this service."
      >
        <form
          className="grid gap-5"
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
                  {...fieldA11y(field)}
                />
                <FormFieldError
                  id={`${field.name}-error`}
                  errors={fieldErrors(field)}
                />
              </FormFieldGroup>
            )}
          </form.Field>

          <form.Field name="originUrl">
            {(field) => (
              <FormFieldGroup>
                <FormFieldLabel htmlFor={field.name}>Origin URL</FormFieldLabel>
                <Input
                  id={field.name}
                  className={controlClassName}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  {...fieldA11y(field, true)}
                />
                <FormFieldHint id={`${field.name}-hint`}>
                  Routing changes apply within the gateway's cache TTL.
                </FormFieldHint>
                <FormFieldError
                  id={`${field.name}-error`}
                  errors={fieldErrors(field)}
                />
              </FormFieldGroup>
            )}
          </form.Field>

          {updateService.error ? (
            <p role="alert" className="text-xs text-destructive">
              {updateService.error.message}
            </p>
          ) : null}

          <div>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  size="default"
                  disabled={!canSubmit || isSubmitting}
                >
                  {isSubmitting ? "Saving…" : "Save changes"}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </FormSection>

      <section className="grid gap-4 border-t pt-6">
        <div className="grid gap-1">
          <h2 className="font-heading text-sm font-medium text-destructive">
            Danger zone
          </h2>
          <p className="text-sm/relaxed text-muted-foreground">
            Permanently delete this service and all plans, consumers, and keys.
          </p>
        </div>
        <div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="default"
                disabled={deleteService.isPending}
              >
                Delete service
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{service.name}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  Plans, consumers and keys are removed with it. Consumer traffic
                  to {service.hostKey}.{gatewayDomain} will 404 immediately.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteService.mutate()}>
                  Delete service
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {deleteService.error ? (
            <p role="alert" className="mt-2 text-xs text-destructive">
              {deleteService.error.message}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
