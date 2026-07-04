import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
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
import { Label } from "@/components/ui/label";
import { gatewayDomain, readApiError, serviceQuery } from "@/lib/gateway-queries";
import { client } from "@/lib/rpc";
import { createServiceSchema } from "../../../../../server/routes/protected/services/schemas";

export const Route = createFileRoute("/_app/services/$serviceId/")({
  component: ServiceOverview,
});

const settingsSchema = createServiceSchema.pick({
  name: true,
  originUrl: true,
});

type UpdateService = z.infer<typeof settingsSchema>;

function ServiceOverview() {
  const { serviceId } = Route.useParams();
  const { data: service } = useSuspenseQuery(serviceQuery(serviceId));
  const queryClient = useQueryClient();
  const navigate = Route.useNavigate();

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
      navigate({ to: "/services" });
    },
  });

  const form = useForm({
    defaultValues: { name: service.name, originUrl: service.originUrl },
    validators: { onSubmit: settingsSchema },
    onSubmit: ({ value }) => updateService.mutateAsync(value),
  });

  const curl = `curl http://${service.hostKey}.${gatewayDomain}/`;

  return (
    <div className="max-w-lg space-y-8">
      <section className="space-y-2">
        <h2 className="text-sm font-medium">Try it</h2>
        <div className="flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded-md border bg-muted/40 px-3 py-2 text-xs">
            {curl}
          </code>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigator.clipboard.writeText(curl)}
          >
            Copy
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Requests to the gateway URL are forwarded to your origin.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium">Settings</h2>
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
                <Label htmlFor={field.name}>
                  Name
                </Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="originUrl">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name}>
                  Origin URL
                </Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Routing changes apply within the gateway's cache TTL.
                </p>
              </div>
            )}
          </form.Field>

          {updateService.error ? (
            <p className="text-sm text-destructive">
              {updateService.error.message}
            </p>
          ) : null}

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <Button type="submit" disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? "Saving…" : "Save changes"}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </section>

      <section className="space-y-2 rounded-md border border-destructive/40 p-4">
        <h2 className="text-sm font-medium">Danger zone</h2>
        <p className="text-xs text-muted-foreground">
          Deleting a service removes its plans, consumers and keys. Consumer
          traffic starts failing immediately.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
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
          <p className="text-sm text-destructive">
            {deleteService.error.message}
          </p>
        ) : null}
      </section>
    </div>
  );
}
