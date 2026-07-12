import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { identitiesQueryOptions } from "@/features/identities/queries";
import { plansQueryOptions } from "@/features/plans/queries";
import { client } from "@/lib/api";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

const NO_IDENTITY = "none";

export function IssueKeyDialog({
  serviceId,
  open,
  onOpenChange,
  onCreated,
}: {
  serviceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (plaintext: string) => void;
}) {
  const queryClient = useQueryClient();
  const identitiesQuery = useQuery(identitiesQueryOptions);
  const plansQuery = useQuery(plansQueryOptions(serviceId));
  const identities = identitiesQuery.data ?? [];
  const plans = plansQuery.data ?? [];

  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: async (value: {
      name: string;
      identityId: string | null;
      planId: string;
      environment: "live" | "test";
    }) => {
      const res = await client.api.keys.$post({
        json: { ...value, serviceId },
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Failed to issue key");
      }
      return res.json();
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["keys", serviceId] });
      onOpenChange(false);
      form.reset();
      onCreated(data.plaintext);
    },
    onError: (mutationError) =>
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to issue key",
      ),
  });

  const form = useForm({
    defaultValues: {
      name: "",
      identityId: "",
      planId: "",
      environment: "live" as "live" | "test",
    },
    onSubmit: async ({ value }) => {
      setError("");
      await mutation.mutateAsync({
        name: value.name,
        identityId: value.identityId || null,
        planId: value.planId,
        environment: value.environment,
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Issue key</DialogTitle>
          <DialogDescription>
            A new API key for this service. You'll see the full key once, right
            after it's created.
          </DialogDescription>
        </DialogHeader>

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
                  placeholder="Production backend"
                  className="w-full"
                />
              </div>
            )}
          </form.Field>

          <form.Field name="identityId">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name}>Identity (optional)</Label>
                <Select
                  value={field.state.value || NO_IDENTITY}
                  onValueChange={(value) =>
                    field.handleChange(value === NO_IDENTITY ? "" : value)
                  }
                >
                  <SelectTrigger id={field.name} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value={NO_IDENTITY}>No identity</SelectItem>
                    {identities.map((identity) => (
                      <SelectItem key={identity.id} value={identity.id}>
                        {identity.externalId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs leading-5 text-muted-foreground">
                  Ties this key to a user or org in your system.
                </p>
              </div>
            )}
          </form.Field>

          <div className="grid grid-cols-2 gap-3">
            <form.Field
              name="planId"
              validators={{
                onChange: ({ value }) =>
                  value ? undefined : { message: "Select a plan" },
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Plan</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={field.handleChange}
                    disabled={plans.length === 0}
                  >
                    <SelectTrigger id={field.name} className="w-full">
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {plans.length === 0 ? (
                    <p className="text-xs leading-5 text-muted-foreground">
                      <Link
                        to="/dashboard/services/$serviceId/plans/new"
                        params={{ serviceId }}
                        className="underline"
                      >
                        Create a plan first
                      </Link>
                    </p>
                  ) : null}
                </div>
              )}
            </form.Field>

            <form.Field name="environment">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Environment</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) =>
                      field.handleChange(value as "live" | "test")
                    }
                  >
                    <SelectTrigger id={field.name} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="test">Test</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
          </div>

          {error ? (
            <p className="text-xs leading-5 text-destructive">{error}</p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit || isSubmitting}>
                  {isSubmitting ? "Issuing..." : "Issue key"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
