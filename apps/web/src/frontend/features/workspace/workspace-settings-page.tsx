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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardHeader } from "@/features/dashboard/dashboard-header";
import { authClient } from "@/lib/auth-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { type SyntheticEvent, useState } from "react";
import { toast } from "sonner";
import {
  type ActiveWorkspace,
  type WorkspaceMember,
  activeWorkspaceQueryOptions,
} from "./queries";

export function WorkspaceSettingsPage() {
  const { data: session } = authClient.useSession();
  const query = useQuery(activeWorkspaceQueryOptions);
  const workspace = query.data;

  if (!workspace) {
    return (
      <>
        <DashboardHeader breadcrumbs={[{ label: "Settings" }]} />
        <div className="px-3 py-4">
          <p className="text-sm text-muted-foreground">Loading workspace...</p>
        </div>
      </>
    );
  }

  const currentMember = workspace.members.find(
    (member) => member.userId === session?.user.id,
  );
  const role = currentMember?.role ?? "member";
  const canManage = role === "owner" || role === "admin";

  return (
    <>
      <DashboardHeader breadcrumbs={[{ label: "Settings" }]} />

      <div className="px-3 py-4">
        <div className="max-w-2xl space-y-10">
          <GeneralSection workspace={workspace} canManage={canManage} />
          <MembersSection
            workspace={workspace}
            role={role}
            currentUserId={session?.user.id}
          />
          {canManage ? <InviteSection workspace={workspace} /> : null}
          <LeaveSection workspace={workspace} />
        </div>
      </div>
    </>
  );
}

function GeneralSection({
  workspace,
  canManage,
}: {
  workspace: ActiveWorkspace;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(workspace.name);

  const mutation = useMutation({
    mutationFn: async (value: string) => {
      const { error } = await authClient.organization.update({
        data: { name: value.trim() },
      });
      if (error) {
        throw new Error(error.message ?? "Failed to rename workspace");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("Workspace renamed");
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Failed to rename workspace",
      ),
  });

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim() && name.trim() !== workspace.name) {
      mutation.mutate(name);
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-medium">General</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Workspace name shown across the dashboard.
        </p>
      </div>
      <form className="flex max-w-md items-end gap-2" onSubmit={handleSubmit}>
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="workspace-name">Name</Label>
          <Input
            id="workspace-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={!canManage}
            className="w-full"
          />
        </div>
        {canManage ? (
          <Button
            type="submit"
            variant="outline"
            disabled={
              mutation.isPending ||
              !name.trim() ||
              name.trim() === workspace.name
            }
          >
            {mutation.isPending ? "Saving..." : "Save"}
          </Button>
        ) : null}
      </form>
    </section>
  );
}

function MembersSection({
  workspace,
  role,
  currentUserId,
}: {
  workspace: ActiveWorkspace;
  role: string;
  currentUserId: string | undefined;
}) {
  const queryClient = useQueryClient();
  const [pendingRemove, setPendingRemove] = useState<WorkspaceMember | null>(
    null,
  );
  const canManage = role === "owner" || role === "admin";

  const roleMutation = useMutation({
    mutationFn: async (value: { memberId: string; role: "member" | "admin" }) => {
      const { error } = await authClient.organization.updateMemberRole({
        memberId: value.memberId,
        role: value.role,
      });
      if (error) {
        throw new Error(error.message ?? "Failed to update role");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("Role updated");
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Failed to update role",
      ),
  });

  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await authClient.organization.removeMember({
        memberIdOrEmail: memberId,
      });
      if (error) {
        throw new Error(error.message ?? "Failed to remove member");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("Member removed");
      setPendingRemove(null);
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Failed to remove member",
      ),
  });

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-medium">Members</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          People with access to this workspace.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {workspace.members.map((member) => {
            const isSelf = member.userId === currentUserId;
            const canEditRole =
              role === "owner" && !isSelf && member.role !== "owner";
            const canRemove = canManage && !isSelf && member.role !== "owner";

            return (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="min-w-0">
                    <p className="truncate">
                      {member.user.name || member.user.email}
                      {isSelf ? (
                        <span className="ml-1 text-muted-foreground">
                          (you)
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.user.email}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  {canEditRole ? (
                    <Select
                      value={member.role}
                      onValueChange={(value) =>
                        roleMutation.mutate({
                          memberId: member.id,
                          role: value as "member" | "admin",
                        })
                      }
                    >
                      <SelectTrigger size="sm" className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="capitalize">{member.role}</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(member.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  {canRemove ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingRemove(member)}
                    >
                      Remove
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <AlertDialog
        open={pendingRemove !== null}
        onOpenChange={(open) => !open && setPendingRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this member?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRemove?.user.email} loses access to this workspace
              immediately. Their keys and services stay.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingRemove) {
                  removeMutation.mutate(pendingRemove.id);
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function InviteSection({ workspace }: { workspace: ActiveWorkspace }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.organization.inviteMember({
        email: email.trim(),
        role,
      });
      if (error) {
        throw new Error(error.message ?? "Failed to send invitation");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success(`Invitation sent to ${email.trim()}`);
      setEmail("");
      setRole("member");
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Failed to send invitation",
      ),
  });

  const cancelMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await authClient.organization.cancelInvitation({
        invitationId,
      });
      if (error) {
        throw new Error(error.message ?? "Failed to cancel invitation");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("Invitation canceled");
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel invitation",
      ),
  });

  const pending = workspace.invitations.filter(
    (invitation) => invitation.status === "pending",
  );

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (email.trim()) {
      inviteMutation.mutate();
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-medium">Invite</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Invitations are sent by email and expire after 48 hours.
        </p>
      </div>

      <form className="flex max-w-md items-end gap-2" onSubmit={handleSubmit}>
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="teammate@company.com"
            className="w-full"
          />
        </div>
        <Select
          value={role}
          onValueChange={(value) => setRole(value as "member" | "admin")}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="member">Member</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" disabled={inviteMutation.isPending || !email.trim()}>
          {inviteMutation.isPending ? "Sending..." : "Invite"}
        </Button>
      </form>

      {pending.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Pending invitations</p>
          <div className="divide-y rounded-md border">
            {pending.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center gap-2 px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate">
                  {invitation.email}
                </span>
                <span className="capitalize text-muted-foreground">
                  {invitation.role}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => cancelMutation.mutate(invitation.id)}
                >
                  Cancel
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function LeaveSection({ workspace }: { workspace: ActiveWorkspace }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function leave() {
    const { error } = await authClient.organization.leave({
      organizationId: workspace.id,
    });
    if (error) {
      toast.error(error.message ?? "Failed to leave workspace");
      return;
    }
    const { data: remaining } = await authClient.organization.list();
    const next = remaining?.[0];
    if (next) {
      await authClient.organization.setActive({ organizationId: next.id });
      queryClient.clear();
      await navigate({ to: "/dashboard" });
    } else {
      await authClient.signOut();
      window.location.replace("/sign-in");
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-medium">Leave workspace</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You lose access to {workspace.name} until someone invites you back.
        </p>
      </div>
      <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
        Leave workspace
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave {workspace.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              You need a new invitation to rejoin. If you are the only owner,
              transfer ownership first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void leave()}>
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
