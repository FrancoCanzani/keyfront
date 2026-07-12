import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { CaretUpDownIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { workspacesQueryOptions } from "./queries";

export function WorkspaceSwitcher() {
  const { data: session } = authClient.useSession();
  const workspacesQuery = useQuery(workspacesQueryOptions);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);

  const activeId = session?.session.activeOrganizationId;
  const workspaces = workspacesQuery.data ?? [];
  const active = workspaces.find((workspace) => workspace.id === activeId);

  async function switchWorkspace(organizationId: string) {
    if (organizationId === activeId) {
      return;
    }
    const { error } = await authClient.organization.setActive({
      organizationId,
    });
    if (error) {
      toast.error(error.message ?? "Failed to switch workspace");
      return;
    }
    queryClient.clear();
    await navigate({ to: "/dashboard" });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex h-8 min-w-0 flex-1 items-center justify-between gap-1.5 rounded-md px-2 text-left text-sm outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring group-data-[collapsible=icon]:hidden">
          <span className="truncate">{active?.name ?? "Keyfront"}</span>
          <CaretUpDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-48">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              className={
                workspace.id === activeId ? "font-medium text-foreground" : undefined
              }
              onSelect={() => void switchWorkspace(workspace.id)}
            >
              <span className="truncate">{workspace.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
            New workspace
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/dashboard/settings">Workspace settings</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}

function CreateWorkspaceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: async (value: { name: string }) => {
      const { data, error: createError } = await authClient.organization.create(
        {
          name: value.name.trim(),
          slug: crypto.randomUUID().slice(0, 8),
        },
      );
      if (createError) {
        throw new Error(createError.message ?? "Failed to create workspace");
      }
      return data;
    },
    onSuccess: async (created) => {
      await authClient.organization.setActive({ organizationId: created.id });
      queryClient.clear();
      toast.success("Workspace created");
      onOpenChange(false);
      form.reset();
      await navigate({ to: "/dashboard" });
    },
    onError: (mutationError) =>
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to create workspace",
      ),
  });

  const form = useForm({
    defaultValues: { name: "" },
    onSubmit: async ({ value }) => {
      setError("");
      await mutation.mutateAsync(value);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New workspace</DialogTitle>
          <DialogDescription>
            A workspace groups your services, keys, and team. You can invite
            people from workspace settings.
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
                  placeholder="Acme"
                  className="w-full"
                />
              </div>
            )}
          </form.Field>

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
                  {isSubmitting ? "Creating..." : "Create workspace"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
