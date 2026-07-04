import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data) {
      throw redirect({ to: "/sign-in" });
    }
    if (data.session.activeOrganizationId) {
      throw redirect({
        to: "/$orgId/services",
        params: { orgId: data.session.activeOrganizationId },
      });
    }
  },
  component: OnboardingPage,
});

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "org"}-${Math.random().toString(36).slice(2, 6)}`;
}

function OnboardingPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);

    const created = await authClient.organization.create({
      name: name.trim(),
      slug: slugify(name.trim()),
    });
    if (created.error || !created.data) {
      setError(created.error?.message ?? "Failed to create organization");
      setLoading(false);
      return;
    }

    await authClient.organization.setActive({
      organizationId: created.data.id,
    });

    navigate({
      to: "/$orgId/services",
      params: { orgId: created.data.id },
    });
  }

  return (
    <div className="grid min-h-svh place-items-center px-4">
      <div className="w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-lg font-medium">Create your organization</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Services, keys, and billing are scoped to an organization.
          </p>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Inc"
            required
            autoFocus
          />
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={loading || !name.trim()}>
            {loading ? "Creating…" : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
