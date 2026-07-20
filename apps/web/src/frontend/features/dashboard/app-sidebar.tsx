import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { CaretUpDownIcon, UserIcon } from "@phosphor-icons/react";

export function AppSidebar() {
  const { data: session } = authClient.useSession();

  const name = session?.user.name || "Account";
  const email = session?.user.email || "";

  async function signOut() {
    await authClient.signOut();
    window.location.replace("/sign-in");
  }

  return (
    <Sidebar className="z-20">
      <SidebarHeader className="h-12 justify-center">
        <div className="flex items-center gap-2 p-1 group-data-[collapsible=icon]:justify-center">
          <span className="text-sm tracking-[-0.02em]">vurl</span>
          <SidebarTrigger className="*:size-3.5 group-data-[collapsible=icon]:*:size-4" />
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-1" />

      <SidebarFooter className="p-2">
        <SidebarMenu className="gap-1">
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" tooltip={name}>
                  <div className="hidden size-8 shrink-0 items-center justify-center group-data-[collapsible=icon]:flex">
                    <UserIcon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="block truncate">{name}</span>
                    <span className="block truncate text-muted-foreground">
                      {email}
                    </span>
                  </div>
                  <CaretUpDownIcon className="ml-auto group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="right"
                align="end"
                sideOffset={8}
                className="min-w-48"
              >
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
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
