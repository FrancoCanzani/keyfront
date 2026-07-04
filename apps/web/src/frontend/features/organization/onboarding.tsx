import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "org"}-${Math.random().toString(36).slice(2, 6)}`;
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userName.trim() || !orgName.trim()) return;
    setLoading(true);
    setError(null);

    const updated = await authClient.updateUser({ name: userName.trim() });
    if (updated.error) {
      setError(updated.error.message ?? "Failed to update profile");
      setLoading(false);
      return;
    }

    const created = await authClient.organization.create({
      name: orgName.trim(),
      slug: slugify(orgName.trim()),
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
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="font-heading text-lg font-medium">Welcome to Keyfront</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tell us your name and organization to get started.
          </p>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="userName">Your name</Label>
            <Input
              id="userName"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Franco"
              required
              autoFocus
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="orgName">Organization</Label>
            <Input
              id="orgName"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Acme Inc"
              required
            />
            <p className="text-xs text-muted-foreground">
              Services, keys, and billing are scoped to an organization.
            </p>
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={loading || !userName.trim() || !orgName.trim()}
          >
            {loading ? "Creating…" : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
