import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export type UserMenuUser = {
  name: string;
  email: string;
};

export function UserMenu({
  orgId,
  user,
  onSignOut,
}: {
  orgId: string;
  user: UserMenuUser;
  onSignOut: () => void | Promise<void>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 max-w-44 shrink-0 gap-2 px-2 font-normal"
        >
          <span className="truncate">{user.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52 w-56 p-1 text-xs">
        <DropdownMenuLabel className="grid gap-0.5 px-2 py-1 font-normal">
          <span className="truncate text-sm">{user.name}</span>
          <span className="truncate text-xs text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="min-h-7 px-2 py-1 font-normal">
          <Link to="/$orgId/settings" params={{ orgId }}>
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="min-h-7 px-2 py-1 font-normal">
          <Link to="/$orgId/team" params={{ orgId }}>
            Team
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          className="min-h-7 px-2 py-1 font-normal"
          onClick={onSignOut}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
