import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardHeader } from "@/features/dashboard/dashboard-header";
import { client } from "@/lib/api";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { serviceQueryOptions } from "./queries";

const route = getRouteApi("/dashboard/services/$serviceId/settings");

export function ServiceSettingsPage() {
  const { serviceId } = route.useParams();
  const serviceQuery = useQuery(serviceQueryOptions(serviceId));
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState("");

  const service = serviceQuery.data;

  const updateMutation = useMutation({
    mutationFn: async (value: { name: string; upstream: string }) => {
      const res = await client.api.services[":id"].$patch({
        param: { id: serviceId },
        json: value,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Failed to update service");
      }
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Service updated");
    },
    onError: (mutationError) =>
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to update service",
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await client.api.services[":id"].$delete({
        param: { id: serviceId },
      });
      if (!res.ok) {
        throw new Error("Failed to delete service");
      }
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Service deleted");
      void navigate({ to: "/dashboard" });
    },
    onError: () => toast.error("Failed to delete service"),
    onSettled: () => setDeleteOpen(false),
  });

  const form = useForm({
    defaultValues: {
      name: service?.name ?? "",
      upstream: service?.upstream ?? "",
    },
    onSubmit: async ({ value }) => {
      setError("");
      await updateMutation.mutateAsync(value);
    },
  });

  return (
    <>
      <DashboardHeader
        breadcrumbs={[
          { label: "Services", href: "/dashboard" },
          {
            label: service?.name ?? "Service",
            href: `/dashboard/services/${serviceId}`,
          },
          { label: "Settings" },
        ]}
      />

      <div className="px-3 py-4">
        <div className="max-w-xl space-y-8">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              form.handleSubmit();
            }}
          >
            <form.Field
              name="name"
              validators={{
                onChange: ({ value }) =>
                  value.trim() ? undefined : { message: "Name is required" },
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Name</Label>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    className="w-full"
                  />
                </div>
              )}
            </form.Field>

            <form.Field
              name="upstream"
              validators={{
                onChange: ({ value }) => {
                  if (!value.trim()) {
                    return { message: "Origin URL is required" };
                  }
                  try {
                    new URL(value);
                    return undefined;
                  } catch {
                    return { message: "Must be a valid URL with scheme" };
                  }
                },
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Origin URL</Label>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    className="w-full"
                  />
                  <p className="text-xs leading-5 text-muted-foreground">
                    Traffic switches to the new origin within the gateway's
                    cache window.
                  </p>
                </div>
              )}
            </form.Field>

            {error ? (
              <p className="text-xs leading-5 text-destructive">{error}</p>
            ) : null}

            <div className="flex justify-end">
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button type="submit" disabled={!canSubmit || isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save changes"}
                  </Button>
                )}
              </form.Subscribe>
            </div>
          </form>

          <div className="space-y-3 rounded-md border border-destructive/30 p-4">
            <div>
              <h2 className="text-sm font-medium">Delete this service</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {service?.host} stops routing immediately. This can't be
                undone.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
            >
              Delete service
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this service?</AlertDialogTitle>
            <AlertDialogDescription>
              {service?.host} will stop routing immediately. This can't be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
