import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  fieldA11y,
  fieldErrors,
  FormFieldError,
  FormFieldGroup,
  FormFieldHint,
  FormFieldLabel,
} from "@/components/form-layout";
import { gatewayDomain, readApiError } from "@/lib/gateway-queries";
import { client } from "@/lib/rpc";
import {
  createServiceSchema,
  hostKeySchema,
} from "../../../server/routes/protected/services/schemas";

type CreateService = z.infer<typeof createServiceSchema>;

function suggestHostKey(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function NewServiceDialog({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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
      close();
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

  function close() {
    setOpen(false);
    form.reset();
    createService.reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : close())}
    >
      <DialogTrigger asChild>
        <Button className="h-8 shrink-0">New service</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New service</DialogTitle>
          <DialogDescription>
            Point a subdomain of the gateway at your API's origin.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
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
              <FormFieldGroup>
                <FormFieldLabel htmlFor={field.name}>Name</FormFieldLabel>
                <Input
                  id={field.name}
                  className={controlClassName}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Acme API"
                  {...fieldA11y(field)}
                />
                <FormFieldError
                  id={`${field.name}-error`}
                  errors={fieldErrors(field)}
                />
              </FormFieldGroup>
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
              const wellFormed = hostKeySchema.safeParse(
                field.state.value,
              ).success;
              return (
                <FormFieldGroup>
                  <FormFieldLabel htmlFor={field.name}>Host key</FormFieldLabel>
                  <Input
                    id={field.name}
                    className={controlClassName}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="acme"
                    {...fieldA11y(field, true)}
                  />
                  <FormFieldHint id={`${field.name}-hint`}>
                    Consumers will call{" "}
                    <code className="font-mono tabular-nums">{`${field.state.value || "acme"}.${gatewayDomain}`}</code>
                    . Cannot be changed later.
                  </FormFieldHint>
                  {field.state.meta.isValidating ? (
                    <p className="text-xs text-muted-foreground">
                      Checking availability…
                    </p>
                  ) : wellFormed && field.state.meta.errors.length === 0 ? (
                    <p className="text-xs text-green-700">Available</p>
                  ) : null}
                  <FormFieldError
                    id={`${field.name}-error`}
                    errors={fieldErrors(field)}
                  />
                </FormFieldGroup>
              );
            }}
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
                  placeholder="https://api.acme.com"
                  {...fieldA11y(field, true)}
                />
                <FormFieldHint id={`${field.name}-hint`}>
                  Where the gateway forwards authenticated traffic.
                </FormFieldHint>
                <FormFieldError
                  id={`${field.name}-error`}
                  errors={fieldErrors(field)}
                />
              </FormFieldGroup>
            )}
          </form.Field>

          {createService.error ? (
            <p role="alert" className="text-xs text-destructive">
              {createService.error.message}
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
                  {isSubmitting ? "Creating…" : "Create service"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
