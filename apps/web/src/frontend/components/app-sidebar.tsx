import { Link, useParams } from "@tanstack/react-router";
import { Layers } from "lucide-react";
import { OrganizationMenuItems } from "@/components/organization-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
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
} from "@/components/ui/sidebar";
import { useSelectedSidebarPath } from "@/hooks/use-selected-sidebar-path";
import { MAIN_NAV } from "@/lib/auth-shell-nav";

export type AppShellUser = {
  name: string;
  email: string;
};

type AppSidebarProps = {
  user: AppShellUser;
  onSignOut: () => void | Promise<void>;
};

const sidebarItemClassName =
  "h-8 min-h-8 !text-sm font-normal data-active:font-normal [&_svg]:!size-3.5";

const NAV_ICON_BY_TO = {
  "/$orgId/services": Layers,
} as const;

export function AppSidebar({ user, onSignOut }: AppSidebarProps) {
  const { orgId } = useParams({ from: "/$orgId" });
  const { isActive } = useSelectedSidebarPath();

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="api-gateway">
              <Link to="/$orgId/services" params={{ orgId }}>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">api-gateway</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {MAIN_NAV.map((item) => {
                const Icon = NAV_ICON_BY_TO[item.to];
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.to)}
                      tooltip={item.label}
                      className={sidebarItemClassName}
                    >
                      <Link
                        to={item.to}
                        params={{ orgId }}
                        className="flex min-w-0 flex-1 items-center gap-2"
                      >
                        <Icon className="shrink-0 text-sidebar-foreground" />
                        <span className="truncate">{item.label}</span>
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="h-11 min-h-11 py-2">
                  <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs text-sidebar-foreground/70">
                      {user.email}
                    </span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="end"
                className="max-h-[min(24rem,var(--radix-dropdown-menu-content-available-height))] min-w-52 w-56 overflow-y-auto rounded-md p-1 text-xs"
              >
                <DropdownMenuLabel className="grid gap-0.5 px-2 py-1 font-normal text-foreground">
                  <span className="truncate text-sm">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <OrganizationMenuItems />
                <DropdownMenuItem
                  asChild
                  className="min-h-7 px-2 py-1 text-xs font-normal focus:bg-muted/60 focus-visible:ring-0"
                >
                  <Link
                    to="/$orgId/settings"
                    params={{ orgId }}
                    className="cursor-pointer"
                  >
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  className="min-h-7 px-2 py-1 text-xs font-normal focus:bg-muted/60 focus-visible:ring-0"
                >
                  <Link
                    to="/$orgId/team"
                    params={{ orgId }}
                    className="cursor-pointer"
                  >
                    Team
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  className="min-h-7 px-2 py-1 text-xs font-normal focus-visible:ring-0"
                  onClick={onSignOut}
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
