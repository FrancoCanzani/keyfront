import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { useForm } from "@tanstack/react-form";
import { getRouteApi } from "@tanstack/react-router";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

const route = getRouteApi("/onboarding");

export function Onboarding() {
  const { organizationId, name } = route.useLoaderData();
  const navigate = route.useNavigate();
  const [error, setError] = useState("");

  const form = useForm({
    defaultValues: {
      name: name ?? "",
      organizationName: "",
    },
    onSubmit: async ({ value }) => {
      setError("");

      const updated = await authClient.updateUser({
        name: value.name,
        onboardedAt: new Date(),
      });
      if (updated.error) {
        setError(updated.error.message ?? "Something went wrong. Try again.");
        return;
      }

      if (organizationId) {
        const org = await authClient.organization.update({
          organizationId,
          data: { name: value.organizationName },
        });
        if (org.error) {
          setError(org.error.message ?? "Something went wrong. Try again.");
          return;
        }
      }

      await navigate({ to: "/dashboard" });
    },
  });

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="absolute left-6 top-6 sm:left-8 sm:top-8">
        <span className="text-sm tracking-[-0.02em]">Keyfront</span>
      </div>

      <div className="flex min-h-dvh items-center justify-center px-6 py-28">
        <section className="w-full max-w-84">
          <h1 className="text-2xl font-medium leading-tight">
            Set up your workspace
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Tell us who you are and name your organization.
          </p>

          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              form.handleSubmit();
            }}
          >
            <form.Field
              name="name"
              validators={{ onChange: z.string().min(1, "Enter your name") }}
            >
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Your name</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    autoFocus
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={field.state.meta.errors.length > 0}
                    placeholder="Ada Lovelace"
                    className="w-full"
                  />
                  {field.state.meta.errors.length > 0 ? (
                    <p className="text-xs leading-5 text-destructive">
                      {String(field.state.meta.errors[0]?.message ?? "")}
                    </p>
                  ) : null}
                </div>
              )}
            </form.Field>

            <form.Field
              name="organizationName"
              validators={{
                onChange: z.string().min(1, "Enter an organization name"),
              }}
            >
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Organization name</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={field.state.meta.errors.length > 0}
                    placeholder="Acme Inc"
                    className="w-full"
                  />
                  {field.state.meta.errors.length > 0 ? (
                    <p className="text-xs leading-5 text-destructive">
                      {String(field.state.meta.errors[0]?.message ?? "")}
                    </p>
                  ) : null}
                </div>
              )}
            </form.Field>

            {error ? (
              <p className="text-xs leading-5 text-destructive">{error}</p>
            ) : null}

            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  size="lg"
                  disabled={!canSubmit || isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="ml-auto size-3.5 opacity-65" />
                    </>
                  )}
                </Button>
              )}
            </form.Subscribe>
          </form>
        </section>
      </div>
    </main>
  );
}
