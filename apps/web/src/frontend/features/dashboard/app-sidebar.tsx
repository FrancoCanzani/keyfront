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
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { Link, useLocation } from "@tanstack/react-router";
import {
  CaretUpDownIcon,
  ChartLineUpIcon,
  CubeIcon,
  GaugeIcon,
  KeyIcon,
  PulseIcon,
  ShieldCheckIcon,
  UserIcon,
  UsersIcon,
} from "@phosphor-icons/react";

const primaryItems = [
  { label: "Overview", icon: GaugeIcon, to: "/dashboard" },
  { label: "Services", icon: CubeIcon, to: "/dashboard/services" },
  { label: "Consumers", icon: UsersIcon },
  { label: "API keys", icon: KeyIcon },
  { label: "Request logs", icon: PulseIcon },
];

const manageItems = [
  { label: "Usage", icon: ChartLineUpIcon },
  { label: "Plans", icon: ShieldCheckIcon, to: "/dashboard/plans" },
];

export function AppSidebar() {
  const { data: session } = authClient.useSession();
  const { pathname } = useLocation();
  const name = session?.user.name || "Franco";
  const email = session?.user.email || "Personal workspace";

  async function signOut() {
    await authClient.signOut();
    window.location.replace("/sign-in");
  }

  return (
    <Sidebar className="z-20">
      <SidebarHeader className="h-12 justify-center">
        <div className="flex items-center gap-2 p-1 group-data-[collapsible=icon]:justify-center">
          <span className="min-w-0 flex-1 truncate font-medium group-data-[collapsible=icon]:hidden">
            Keyfront
          </span>
          <SidebarTrigger className="*:size-3.5 group-data-[collapsible=icon]:*:size-4" />
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-1">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {primaryItems.map((item) => {
                const active = item.to ? pathname === item.to : false;

                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      asChild={Boolean(item.to)}
                      tooltip={item.label}
                      isActive={active}
                      className="[&_svg]:size-3.5 group-data-[collapsible=icon]:[&_svg]:size-4"
                    >
                      {item.to ? (
                        <Link to={item.to}>
                          <item.icon weight={active ? "fill" : "regular"} />
                          <span>{item.label}</span>
                        </Link>
                      ) : (
                        <>
                          <item.icon weight="regular" />
                          <span>{item.label}</span>
                        </>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Manage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {manageItems.map((item) => {
                const active = item.to ? pathname === item.to : false;

                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      asChild={Boolean(item.to)}
                      tooltip={item.label}
                      isActive={active}
                      className="[&_svg]:size-3.5 group-data-[collapsible=icon]:[&_svg]:size-4"
                    >
                      {item.to ? (
                        <Link to={item.to}>
                          <item.icon weight={active ? "fill" : "regular"} />
                          <span>{item.label}</span>
                        </Link>
                      ) : (
                        <>
                          <item.icon weight="regular" />
                          <span>{item.label}</span>
                        </>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

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
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuItem>Documentation</DropdownMenuItem>
                  <DropdownMenuItem>Switch workspace</DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => void signOut()}
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
