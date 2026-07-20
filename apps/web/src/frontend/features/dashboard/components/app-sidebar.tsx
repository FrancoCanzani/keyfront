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
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { CaretUpDownIcon, LinkIcon, UserIcon } from "@phosphor-icons/react";
import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";

const navItems = [{ label: "Links", icon: LinkIcon, to: "/dashboard" }];

export function AppSidebar() {
  const { data: session } = authClient.useSession();
  const { pathname } = useLocation();
  const { setOpen } = useSidebar();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const name = session?.user.name || "Account";
  const email = session?.user.email || "";

  async function signOut() {
    await authClient.signOut();
    window.location.replace("/sign-in");
  }

  return (
    <Sidebar
      collapsible="icon"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        if (!accountMenuOpen) setOpen(false);
      }}
      className="border-none"
    >
      <SidebarHeader className="h-12 justify-center">
        <div className="flex items-center gap-0.5 px-1">
          <span className="text-sm font-medium tracking-[-0.02em]">v</span>
          <span className="text-sm font-medium tracking-[-0.02em] group-data-[collapsible=icon]:hidden">
            url
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const active = pathname === item.to;
                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={item.to}>
                        <item.icon weight={active ? "fill" : "regular"} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu
              open={accountMenuOpen}
              onOpenChange={(open) => {
                setAccountMenuOpen(open);
                setOpen(open);
              }}
            >
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <UserIcon />
                  <span className="min-w-0 flex-1 truncate text-left">
                    {name}
                  </span>
                  <CaretUpDownIcon className="ml-auto" />
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
    </Sidebar>
  );
}
