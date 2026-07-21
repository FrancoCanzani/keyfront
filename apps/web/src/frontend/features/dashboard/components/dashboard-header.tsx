import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { CaretUpDownIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

export function DashboardHeader() {
  const { data: session } = authClient.useSession();

  const name = session?.user.name || "Account";
  const email = session?.user.email || "";

  async function signOut() {
    await authClient.signOut();
    window.location.replace("/sign-in");
  }

  return (
    <header className="sticky top-0 z-20 bg-background">
      <div className="mx-auto flex h-12 w-full max-w-4xl items-center justify-between px-6">
        <Link to="/dashboard" className="text-sm font-medium tracking-[-0.02em]">
          vurl
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <span className="max-w-32 truncate">{name}</span>
              <CaretUpDownIcon className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="min-w-48">
            <DropdownMenuLabel>
              <span className="block truncate text-foreground">{name}</span>
              <span className="block truncate font-normal">{email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => void signOut()}
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
