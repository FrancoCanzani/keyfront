import { useState } from "react";
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
import type { client } from "@/lib/rpc";

export type Plan = InferResponseType<typeof client.api.plans.$get, 200>[number];

const columnHelper = createColumnHelper<Plan>();

function Header({ label }: { label: string }) {
  return <span className="px-2">{label}</span>;
}

function PlanRowActions({
  plan,
  onDelete,
  deletePending,
}: {
  plan: Plan;
  onDelete: (id: string) => void;
  deletePending: boolean;
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
              disabled={deletePending}
              onClick={(event) => event.stopPropagation()}
            >
              <MoreHorizontalIcon className="size-3.5" />
              <span className="sr-only">Plan actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 p-1">
            <DropdownMenuItem
              variant="destructive"
              className="min-h-7 px-2 py-1"
              disabled={deletePending}
              onSelect={(event) => {
                event.preventDefault();
                setConfirmOpen(true);
              }}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete plan "{plan.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Plans with live API keys can't be deleted. Revoke their keys
              first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDelete(plan.id)}>
              Delete plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function createPlansColumns({
  onDelete,
  deletePending,
}: {
  onDelete: (id: string) => void;
  deletePending: boolean;
}) {
  return [
    columnHelper.accessor("name", {
      header: () => <Header label="Name" />,
      cell: (info) => (
        <span className="font-medium text-foreground">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("rps", {
      header: () => <Header label="RPS" />,
      cell: (info) => (
        <span className="font-data tabular-nums">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("burst", {
      header: () => <Header label="Burst" />,
      cell: (info) => (
        <span className="font-data tabular-nums">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("monthlyQuota", {
      header: () => <Header label="Monthly quota" />,
      cell: (info) => (
        <span className="font-data tabular-nums text-muted-foreground">
          {info.getValue()?.toLocaleString() ?? "Unlimited"}
        </span>
      ),
    }),
    columnHelper.accessor("priceCents", {
      header: () => <Header label="Price" />,
      cell: (info) => (
        <span className="font-data tabular-nums text-muted-foreground">
          ${(info.getValue() / 100).toFixed(2)}/mo
        </span>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: () => null,
      cell: (info) => (
        <PlanRowActions
          plan={info.row.original}
          onDelete={onDelete}
          deletePending={deletePending}
        />
      ),
    }),
  ];
}

export const PLANS_COL_WIDTHS = ["26%", "13%", "13%", "21%", "17%", "10%"];
