import { Link } from "@tanstack/react-router";
import { ChevronsUpDown } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const organizationsQueryOptions = {
  queryKey: ["organizations"],
  queryFn: async () => {
    const [orgs, session] = await Promise.all([
      authClient.organization.list(),
      authClient.getSession(),
    ]);
    if (orgs.error || !orgs.data) {
      throw new Error(orgs.error?.message ?? "Failed to load organizations");
    }
    return {
      organizations: orgs.data,
      activeId: session.data?.session.activeOrganizationId ?? null,
    };
  },
};

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "org"}-${Math.random().toString(36).slice(2, 6)}`;
}

export function OrganizationSwitcher({
  orgName,
  variant = "button",
}: {
  orgName: string;
  variant?: "button" | "breadcrumb";
}) {
  const { data } = useQuery(organizationsQueryOptions);

  const switchOrg = useMutation({
    mutationFn: async (organizationId: string) => {
      const result = await authClient.organization.setActive({ organizationId });
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: (_, organizationId) => {
      window.location.assign(`/${organizationId}/services`);
    },
  });

  const createOrg = useMutation({
    mutationFn: async () => {
      const name = window.prompt("Organization name");
      if (!name?.trim()) return null;
      const created = await authClient.organization.create({
        name: name.trim(),
        slug: slugify(name.trim()),
      });
      if (created.error || !created.data) {
        throw new Error(created.error?.message ?? "Failed to create organization");
      }
      await authClient.organization.setActive({
        organizationId: created.data.id,
      });
      return created.data.id;
    },
    onSuccess: (id) => {
      if (id) window.location.assign(`/${id}/services`);
    },
  });

  const trigger =
    variant === "breadcrumb" ? (
      <button
        type="button"
        className="inline-flex max-w-48 items-center gap-1 truncate font-medium text-foreground hover:text-foreground/80"
      >
        <span className="truncate">{orgName}</span>
        <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
      </button>
    ) : (
      <Button
        variant="outline"
        size="sm"
        className="h-8 max-w-48 gap-1.5 px-2.5 font-normal"
      >
        <span className="truncate">{orgName}</span>
        <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
      </Button>
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52 w-56 p-1 text-xs">
        <DropdownMenuLabel className="px-2 py-1 text-[11px] font-normal text-muted-foreground">
          Organizations
        </DropdownMenuLabel>
        {(data?.organizations ?? []).map((org) => {
          const active = org.id === data?.activeId;
          return (
            <DropdownMenuItem
              key={org.id}
              disabled={active || switchOrg.isPending}
              className="min-h-7 px-2 py-1 font-normal"
              onClick={() => switchOrg.mutate(org.id)}
            >
              <span className="truncate">{org.name}</span>
              {active ? <span className="ml-auto text-[11px]">✓</span> : null}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="min-h-7 px-2 py-1 font-normal"
          disabled={createOrg.isPending}
          onClick={() => createOrg.mutate()}
        >
          New organization…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DashboardBreadcrumbs({
  orgId,
  orgName,
  serviceName,
}: {
  orgId: string;
  orgName: string;
  serviceName?: string;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex min-w-0 flex-1 items-center gap-2 text-sm"
    >
      <Link
        to="/$orgId/services"
        params={{ orgId }}
        className="shrink-0 font-medium text-foreground hover:underline underline-offset-4"
      >
        Keyfront
      </Link>
      <span className="shrink-0 text-muted-foreground">/</span>
      <OrganizationSwitcher orgName={orgName} variant="breadcrumb" />
      {serviceName ? (
        <>
          <span className="shrink-0 text-muted-foreground">/</span>
          <Link
            to="/$orgId/services"
            params={{ orgId }}
            className="shrink-0 text-muted-foreground hover:text-foreground hover:underline underline-offset-4"
          >
            Services
          </Link>
          <span className="shrink-0 text-muted-foreground">/</span>
          <span className="truncate font-medium text-foreground">
            {serviceName}
          </span>
        </>
      ) : null}
    </nav>
  );
}

export const dashboardChromeClass = "px-6";

export const dashboardSectionGapClass = "gap-5";
