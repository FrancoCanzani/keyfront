import { useState, type ReactNode } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import type { InferResponseType } from "hono/client";
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
import type { client } from "@/lib/rpc";
import { cn } from "@/lib/utils";
import { EnvironmentBadge, KeyStatusBadge } from "./key-status-badge";

export type ApiKeyRow = InferResponseType<
  typeof client.api.keys.$get,
  200
>[number];

const columnHelper = createColumnHelper<ApiKeyRow>();

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
    <span
      className={cn("block truncate", className)}
      title={title}
    >
      {children}
    </span>
  );
}

type KeyRowActionsProps = {
  row: ApiKeyRow;
  onToggle: (input: { id: string; enabled: boolean }) => void;
  onRotate: (id: string) => void;
  onRevoke: (id: string) => void;
  togglePending: boolean;
  rotatePending: boolean;
  revokePending: boolean;
};

function KeyRowActions({
  row,
  onToggle,
  onRotate,
  onRevoke,
  togglePending,
  rotatePending,
  revokePending,
}: KeyRowActionsProps) {
  const [confirm, setConfirm] = useState<"rotate" | "revoke" | null>(null);
  const pending = togglePending || rotatePending || revokePending;

  return (
    <>
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
            <span className="sr-only">Key actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36 p-1">
          <DropdownMenuItem
            className="min-h-7 px-2 py-1"
            disabled={togglePending}
            onSelect={() => onToggle({ id: row.id, enabled: !row.enabled })}
          >
            {row.enabled ? "Pause" : "Resume"}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="min-h-7 px-2 py-1"
            disabled={rotatePending}
            onSelect={(event) => {
              event.preventDefault();
              setConfirm("rotate");
            }}
          >
            Rotate
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            className="min-h-7 px-2 py-1"
            disabled={revokePending}
            onSelect={(event) => {
              event.preventDefault();
              setConfirm("revoke");
            }}
          >
            Revoke
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={confirm === "rotate"}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate {row.prefix}?</AlertDialogTitle>
            <AlertDialogDescription>
              A new key is issued with the same consumer, plan and expiry. The
              old key stops working within seconds, so make sure whoever uses it
              is ready to swap.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onRotate(row.id)}>
              Rotate key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirm === "revoke"}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke {row.prefix}?</AlertDialogTitle>
            <AlertDialogDescription>
              Requests with this key start failing within the gateway's cache
              TTL. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onRevoke(row.id)}>
              Revoke key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function createKeysColumns({
  onToggle,
  onRotate,
  onRevoke,
  togglePending,
  rotatePending,
  revokePending,
}: {
  onToggle: (input: { id: string; enabled: boolean }) => void;
  onRotate: (id: string) => void;
  onRevoke: (id: string) => void;
  togglePending: boolean;
  rotatePending: boolean;
  revokePending: boolean;
}) {
  return [
    columnHelper.accessor("prefix", {
      id: "prefix",
      header: () => <Header label="Key" />,
      cell: (info) => (
        <span className="flex min-w-0 items-center gap-1.5">
          <code className="truncate font-data tabular-nums">
            {info.getValue()}
          </code>
          <EnvironmentBadge environment={info.row.original.environment} />
        </span>
      ),
    }),
    columnHelper.accessor("consumerExternalRef", {
      id: "consumer",
      header: () => <Header label="Consumer" />,
      cell: (info) => {
        const value =
          info.getValue() ?? info.row.original.consumerId.slice(0, 8);
        return (
          <CellText className="text-muted-foreground" title={value}>
            {value}
          </CellText>
        );
      },
    }),
    columnHelper.accessor("planName", {
      id: "plan",
      header: () => <Header label="Plan" />,
      cell: (info) => (
        <CellText className="text-muted-foreground" title={info.getValue()}>
          {info.getValue()}
        </CellText>
      ),
    }),
    columnHelper.accessor("status", {
      id: "status",
      header: () => <Header label="Status" />,
      cell: (info) => (
        <KeyStatusBadge
          status={info.getValue()}
          enabled={info.row.original.enabled}
        />
      ),
    }),
    columnHelper.accessor("lastUsedAt", {
      id: "lastUsed",
      header: () => <Header label="Last used" />,
      cell: (info) => {
        const value = info.getValue();
        if (!value) {
          return <CellText className="text-muted-foreground">Never</CellText>;
        }
        return (
          <TimestampInfo
            value={new Date(value as string).getTime()}
            className="text-xs text-muted-foreground"
          />
        );
      },
    }),
    columnHelper.accessor("expiresAt", {
      id: "expires",
      header: () => <Header label="Expires" />,
      cell: (info) => {
        const value = info.getValue();
        if (!value) {
          return <CellText className="text-muted-foreground">Never</CellText>;
        }
        const ts = new Date(value as string).getTime();
        const expired = ts < Date.now();
        const label = new Date(ts).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        return (
          <CellText
            className={cn(
              "font-data tabular-nums",
              expired ? "text-[#d03b3b]" : "text-muted-foreground",
            )}
            title={label}
          >
            {expired ? `Expired ${label}` : label}
          </CellText>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: () => null,
      cell: (info) =>
        info.row.original.status === "active" ? (
          <KeyRowActions
            row={info.row.original}
            onToggle={onToggle}
            onRotate={onRotate}
            onRevoke={onRevoke}
            togglePending={togglePending}
            rotatePending={rotatePending}
            revokePending={revokePending}
          />
        ) : null,
    }),
  ];
}

export const KEYS_COL_WIDTHS = [
  "22%",
  "18%",
  "14%",
  "10%",
  "16%",
  "14%",
  "6%",
];
