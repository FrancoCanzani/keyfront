import { useState, type ReactNode } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { MoreHorizontalIcon } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TimestampInfo } from "@/components/timestamp-info";
import type { OrgInvitationRow, OrgMemberRow } from "@/lib/organization-queries";
import { hasRole, isOrgOwner, parseRoles } from "@/lib/org-roles";
import { cn } from "@/lib/utils";

export const MEMBERS_COL_WIDTHS = ["24%", "30%", "14%", "18%", "14%"];

export const INVITES_COL_WIDTHS = ["34%", "14%", "18%", "18%", "16%"];

const memberColumnHelper = createColumnHelper<OrgMemberRow>();
const inviteColumnHelper = createColumnHelper<OrgInvitationRow>();

function Header({ label }: { label: string }) {
  return <span className="px-2">{label}</span>;
}

function CellText({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span className={cn("block truncate", className)} title={title}>
      {children}
    </span>
  );
}

function OrgRoleBadge({ role }: { role: string }) {
  const primary = parseRoles(role)[0] ?? role;

  if (primary === "owner") {
    return (
      <span className="inline-flex rounded bg-neutral-900 px-1.5 py-0.5 font-data text-xxs text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900">
        owner
      </span>
    );
  }

  if (primary === "admin") {
    return (
      <span className="inline-flex rounded bg-muted px-1.5 py-0.5 font-data text-xxs text-foreground">
        admin
      </span>
    );
  }

  return (
    <span className="inline-flex rounded bg-muted/40 px-1.5 py-0.5 font-data text-xxs text-muted-foreground">
      member
    </span>
  );
}

type MemberActionsProps = {
  row: OrgMemberRow;
  currentUserId: string;
  currentRole: string;
  ownerCount: number;
  canManage: boolean;
  onChangeRole: (input: {
    memberId: string;
    role: "member" | "admin" | "owner";
  }) => void;
  onRemove: (memberId: string) => void;
  pending: boolean;
};

function MemberActions({
  row,
  currentUserId,
  currentRole,
  ownerCount,
  canManage,
  onChangeRole,
  onRemove,
  pending,
}: MemberActionsProps) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const isSelf = row.userId === currentUserId;
  const rowIsOwner = hasRole(row.role, "owner");
  const actorIsOwner = isOrgOwner(currentRole);
  const isLastOwner = rowIsOwner && ownerCount <= 1;

  if (!canManage || isSelf) {
    return <span className="sr-only">No actions</span>;
  }

  const canPromoteToOwner = actorIsOwner && !rowIsOwner;
  const canDemoteOwner = actorIsOwner && rowIsOwner && ownerCount > 1;
  const canSetAdmin = !rowIsOwner || canDemoteOwner;
  const canSetMember = !rowIsOwner || canDemoteOwner;
  const canRemove = !isLastOwner;

  return (
    <>
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={pending}
              onClick={(event) => event.stopPropagation()}
            >
              <MoreHorizontalIcon className="size-3.5" />
              <span className="sr-only">Member actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 p-1">
            {canSetMember ? (
              <DropdownMenuItem
                className="min-h-7 px-2 py-1"
                disabled={pending || hasRole(row.role, "member")}
                onSelect={() =>
                  onChangeRole({ memberId: row.id, role: "member" })
                }
              >
                Set as member
              </DropdownMenuItem>
            ) : null}
            {canSetAdmin ? (
              <DropdownMenuItem
                className="min-h-7 px-2 py-1"
                disabled={pending || hasRole(row.role, "admin")}
                onSelect={() =>
                  onChangeRole({ memberId: row.id, role: "admin" })
                }
              >
                Set as admin
              </DropdownMenuItem>
            ) : null}
            {canPromoteToOwner ? (
              <DropdownMenuItem
                className="min-h-7 px-2 py-1"
                disabled={pending}
                onSelect={() =>
                  onChangeRole({ memberId: row.id, role: "owner" })
                }
              >
                Set as owner
              </DropdownMenuItem>
            ) : null}
            {canRemove ? (
              <DropdownMenuItem
                variant="destructive"
                className="min-h-7 px-2 py-1"
                disabled={pending}
                onSelect={(event) => {
                  event.preventDefault();
                  setConfirmRemove(true);
                }}
              >
                Remove
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {row.user.name || row.user.email}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They will lose access to this organization immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onRemove(row.id)}>
              Remove member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

type CreateMembersColumnsProps = {
  currentUserId: string;
  currentRole: string;
  ownerCount: number;
  canManage: boolean;
  onChangeRole: (input: {
    memberId: string;
    role: "member" | "admin" | "owner";
  }) => void;
  onRemove: (memberId: string) => void;
  pending: boolean;
};

export function createMembersColumns({
  currentUserId,
  currentRole,
  ownerCount,
  canManage,
  onChangeRole,
  onRemove,
  pending,
}: CreateMembersColumnsProps) {
  return [
    memberColumnHelper.accessor((row) => row.user.name || row.user.email, {
      id: "member",
      header: () => <Header label="Member" />,
      cell: ({ row }) => {
        const isYou = row.original.userId === currentUserId;
        const label = row.original.user.name || row.original.user.email;

        return (
          <span className="flex min-w-0 items-center gap-1.5">
            <CellText className="font-medium text-foreground" title={label}>
              {label}
            </CellText>
            {isYou ? (
              <span className="shrink-0 text-muted-foreground">(you)</span>
            ) : null}
          </span>
        );
      },
    }),
    memberColumnHelper.accessor((row) => row.user.email, {
      id: "email",
      header: () => <Header label="Email" />,
      cell: ({ row }) => (
        <CellText
          className="font-data text-muted-foreground"
          title={row.original.user.email}
        >
          {row.original.user.name ? row.original.user.email : "—"}
        </CellText>
      ),
    }),
    memberColumnHelper.accessor("role", {
      header: () => <Header label="Role" />,
      cell: ({ getValue }) => <OrgRoleBadge role={getValue()} />,
    }),
    memberColumnHelper.accessor("createdAt", {
      header: () => <Header label="Joined" />,
      cell: ({ getValue }) => (
        <TimestampInfo
          value={new Date(getValue()).getTime()}
          displayType="relative"
        />
      ),
    }),
    memberColumnHelper.display({
      id: "actions",
      header: () => null,
      cell: ({ row }) => (
        <MemberActions
          row={row.original}
          currentUserId={currentUserId}
          currentRole={currentRole}
          ownerCount={ownerCount}
          canManage={canManage}
          onChangeRole={onChangeRole}
          onRemove={onRemove}
          pending={pending}
        />
      ),
    }),
  ];
}

function InviteRowActions({
  invitation,
  onCancel,
  pending,
}: {
  invitation: OrgInvitationRow;
  onCancel: (invitationId: string) => void;
  pending: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={pending}
              onClick={(event) => event.stopPropagation()}
            >
              <MoreHorizontalIcon className="size-3.5" />
              <span className="sr-only">Invitation actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 p-1">
            <DropdownMenuItem
              variant="destructive"
              className="min-h-7 px-2 py-1"
              disabled={pending}
              onSelect={(event) => {
                event.preventDefault();
                setConfirmOpen(true);
              }}
            >
              Cancel invite
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel invite?</AlertDialogTitle>
            <AlertDialogDescription>
              {invitation.email} will no longer be able to accept this
              invitation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep invite</AlertDialogCancel>
            <AlertDialogAction onClick={() => onCancel(invitation.id)}>
              Cancel invite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function createInvitesColumns({
  onCancel,
  pending,
}: {
  onCancel: (invitationId: string) => void;
  pending: boolean;
}) {
  return [
    inviteColumnHelper.accessor("email", {
      header: () => <Header label="Email" />,
      cell: ({ getValue }) => (
        <CellText className="font-data" title={getValue()}>
          {getValue()}
        </CellText>
      ),
    }),
    inviteColumnHelper.accessor("role", {
      header: () => <Header label="Role" />,
      cell: ({ getValue }) => <OrgRoleBadge role={getValue()} />,
    }),
    inviteColumnHelper.accessor("createdAt", {
      header: () => <Header label="Invited" />,
      cell: ({ getValue }) => {
        if (!getValue()) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <TimestampInfo
            value={new Date(getValue() as string | Date).getTime()}
            displayType="relative"
          />
        );
      },
    }),
    inviteColumnHelper.accessor("expiresAt", {
      header: () => <Header label="Expires" />,
      cell: ({ getValue }) => (
        <TimestampInfo
          value={new Date(getValue()).getTime()}
          displayType="relative"
        />
      ),
    }),
    inviteColumnHelper.display({
      id: "actions",
      header: () => null,
      cell: ({ row }) => (
        <InviteRowActions
          invitation={row.original}
          onCancel={onCancel}
          pending={pending}
        />
      ),
    }),
  ];
}

export function countOwners(members: OrgMemberRow[]): number {
  return members.filter((member) => hasRole(member.role, "owner")).length;
}
