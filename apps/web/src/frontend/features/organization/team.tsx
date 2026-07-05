import { useMemo, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { toast } from "sonner";
import { z } from "zod";
import { SectionHeading } from "@/components/section-heading";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  controlClassName,
  FormFieldGroup,
  FormFieldLabel,
} from "@/components/form-layout";
import {
  countOwners,
  createInvitesColumns,
  createMembersColumns,
  INVITES_COL_WIDTHS,
  MEMBERS_COL_WIDTHS,
} from "@/features/organization/team/columns";
import { authClient } from "@/lib/auth-client";
import {
  orgInvitationsQuery,
  orgMembersQuery,
} from "@/lib/organization-queries";
import { canManageOrg } from "@/lib/org-roles";

const route = getRouteApi("/$orgId/team");

const inviteSchema = z.object({
  email: z.email("Enter a valid email"),
  role: z.enum(["member", "admin"]),
});

export function TeamPage() {
  const { orgId } = route.useParams();
  const { user, organization } = route.useRouteContext();
  const queryClient = useQueryClient();

  const canManage = canManageOrg(organization.role);

  const { data: members } = useSuspenseQuery(orgMembersQuery(orgId));
  const { data: invitations = [] } = useQuery({
    ...orgInvitationsQuery(orgId),
    enabled: canManage,
  });

  const pendingInvitations = canManage ? invitations : [];
  const ownerCount = useMemo(() => countOwners(members), [members]);

  const invalidateTeam = () => {
    queryClient.invalidateQueries({ queryKey: ["organization-members", orgId] });
    queryClient.invalidateQueries({
      queryKey: ["organization-invitations", orgId],
    });
  };

  const updateRole = useMutation({
    mutationFn: async (input: {
      memberId: string;
      role: "member" | "admin" | "owner";
    }) => {
      const result = await authClient.organization.updateMemberRole({
        memberId: input.memberId,
        role: input.role,
        organizationId: orgId,
      });
      if (result.error) {
        throw new Error(result.error.message ?? "Failed to update role");
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success("Role updated");
      invalidateTeam();
    },
    onError: (error) => toast.error(error.message),
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const result = await authClient.organization.removeMember({
        memberIdOrEmail: memberId,
        organizationId: orgId,
      });
      if (result.error) {
        throw new Error(result.error.message ?? "Failed to remove member");
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success("Member removed");
      invalidateTeam();
    },
    onError: (error) => toast.error(error.message),
  });

  const cancelInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const result = await authClient.organization.cancelInvitation({
        invitationId,
      });
      if (result.error) {
        throw new Error(result.error.message ?? "Failed to cancel invitation");
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success("Invitation canceled");
      invalidateTeam();
    },
    onError: (error) => toast.error(error.message),
  });

  const memberPending =
    updateRole.isPending || removeMember.isPending || cancelInvitation.isPending;

  const memberColumns = useMemo(
    () =>
      createMembersColumns({
        currentUserId: user.id,
        currentRole: organization.role,
        ownerCount,
        canManage,
        onChangeRole: (input) => updateRole.mutate(input),
        onRemove: (memberId) => removeMember.mutate(memberId),
        pending: memberPending,
      }),
    [
      user.id,
      organization.role,
      ownerCount,
      canManage,
      memberPending,
      updateRole.mutate,
      removeMember.mutate,
    ],
  );

  const inviteColumns = useMemo(
    () =>
      createInvitesColumns({
        onCancel: (id) => cancelInvitation.mutate(id),
        pending: cancelInvitation.isPending,
      }),
    [cancelInvitation.isPending, cancelInvitation.mutate],
  );

  const membersTable = useReactTable({
    data: members,
    columns: memberColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const invitesTable = useReactTable({
    data: pendingInvitations,
    columns: inviteColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const description = canManage
    ? "Invite teammates and manage roles."
    : "People with access to this organization.";

  return (
    <div className="mx-auto w-full max-w-4xl text-xs">
      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SectionHeading title="Team" description={description} />
          {canManage ? <InviteMemberDialog orgId={orgId} onSent={invalidateTeam} /> : null}
        </div>
        <DataTable
          variant="plain"
          size="sm"
          table={membersTable}
          colWidths={MEMBERS_COL_WIDTHS}
          maxHeight="none"
        />
      </section>

      {canManage && pendingInvitations.length > 0 ? (
        <section className="mt-8 grid gap-3">
          <SectionHeading
            title="Pending invitations"
            description="Waiting to be accepted."
          />
          <DataTable
            variant="plain"
            size="sm"
            table={invitesTable}
            colWidths={INVITES_COL_WIDTHS}
            maxHeight="none"
          />
        </section>
      ) : null}
    </div>
  );
}

function InviteMemberDialog({
  orgId,
  onSent,
}: {
  orgId: string;
  onSent: () => void;
}) {
  const [open, setOpen] = useState(false);

  const inviteMember = useMutation({
    mutationFn: async (value: z.infer<typeof inviteSchema>) => {
      const result = await authClient.organization.inviteMember({
        email: value.email.trim(),
        role: value.role,
        organizationId: orgId,
      });
      if (result.error) {
        throw new Error(result.error.message ?? "Failed to send invitation");
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success("Invitation sent");
      close();
      onSent();
    },
  });

  const form = useForm({
    defaultValues: { email: "", role: "member" as "member" | "admin" },
    validators: { onSubmit: inviteSchema },
    onSubmit: async ({ value }) => {
      await inviteMember.mutateAsync(value);
    },
  });

  function close() {
    setOpen(false);
    form.reset();
    inviteMember.reset();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogTrigger asChild>
        <Button className="h-7 shrink-0 text-xs">Invite member</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite member</DialogTitle>
          <DialogDescription>
            They receive an email with a link to join this organization.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <form.Field name="email">
            {(field) => (
              <FormFieldGroup>
                <FormFieldLabel htmlFor={field.name}>Email</FormFieldLabel>
                <Input
                  id={field.name}
                  type="email"
                  className={controlClassName}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="colleague@company.com"
                  autoFocus
                />
              </FormFieldGroup>
            )}
          </form.Field>

          <form.Field name="role">
            {(field) => (
              <FormFieldGroup>
                <FormFieldLabel htmlFor={field.name}>Role</FormFieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(value) =>
                    field.handleChange(value as "member" | "admin")
                  }
                >
                  <SelectTrigger id={field.name} className={controlClassName}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </FormFieldGroup>
            )}
          </form.Field>

          {inviteMember.error ? (
            <p role="alert" className="text-xs text-destructive">
              {inviteMember.error.message}
            </p>
          ) : null}

          <DialogFooter>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit || isSubmitting}>
                  {isSubmitting ? "Sending…" : "Send invitation"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
