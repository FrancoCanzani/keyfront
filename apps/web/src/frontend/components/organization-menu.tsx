import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { useMutation, useQuery } from "@tanstack/react-query";

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

export function OrganizationMenuItems() {
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

  return (
    <>
      <DropdownMenuLabel className="px-2 py-1 text-[11px] font-normal text-muted-foreground">
        Organizations
      </DropdownMenuLabel>
      {(data?.organizations ?? []).map((org) => {
        const active = org.id === data?.activeId;
        return (
          <DropdownMenuItem
            key={org.id}
            disabled={active || switchOrg.isPending}
            className="min-h-7 px-2 py-1 text-xs font-normal focus:bg-muted/60 focus-visible:ring-0"
            onClick={() => switchOrg.mutate(org.id)}
          >
            <span className="truncate">{org.name}</span>
            {active ? <span className="ml-auto text-[11px]">✓</span> : null}
          </DropdownMenuItem>
        );
      })}
      <DropdownMenuItem
        className="min-h-7 px-2 py-1 text-xs font-normal focus:bg-muted/60 focus-visible:ring-0"
        disabled={createOrg.isPending}
        onClick={() => createOrg.mutate()}
      >
        New organization…
      </DropdownMenuItem>
      <DropdownMenuSeparator />
    </>
  );
}
