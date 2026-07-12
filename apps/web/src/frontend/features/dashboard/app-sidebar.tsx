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
import { serviceQueryOptions } from "@/features/services/queries";
import { authClient } from "@/lib/auth-client";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "@tanstack/react-router";
import type { Icon } from "@phosphor-icons/react";
import {
  ArrowLeftIcon,
  CaretUpDownIcon,
  ChartLineUpIcon,
  CubeIcon,
  GaugeIcon,
  GearIcon,
  KeyIcon,
  PulseIcon,
  ShieldCheckIcon,
  UserIcon,
  UsersIcon,
} from "@phosphor-icons/react";

type NavItem = {
  label: string;
  icon: Icon;
  to?: string;
};

const globalItems: NavItem[] = [
  { label: "Services", icon: CubeIcon, to: "/dashboard" },
  { label: "Identities", icon: UsersIcon, to: "/dashboard/identities" },
];

function serviceItems(serviceId: string): NavItem[] {
  const base = `/dashboard/services/${serviceId}`;
  return [
    { label: "Overview", icon: GaugeIcon, to: base },
    { label: "Keys", icon: KeyIcon, to: `${base}/keys` },
    { label: "Plans", icon: ShieldCheckIcon, to: `${base}/plans` },
    { label: "Request logs", icon: PulseIcon },
    { label: "Usage", icon: ChartLineUpIcon },
    { label: "Settings", icon: GearIcon, to: `${base}/settings` },
  ];
}

function NavMenu({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <SidebarMenu className="gap-1">
      {items.map((item) => {
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
                  <span className="text-muted-foreground">{item.label}</span>
                </>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function AppSidebar() {
  const { data: session } = authClient.useSession();
  const { pathname } = useLocation();
  const params = useParams({ strict: false });
  const serviceId = params.serviceId;

  const serviceQuery = useQuery({
    ...serviceQueryOptions(serviceId ?? ""),
    enabled: Boolean(serviceId),
  });

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
        {serviceId ? (
          <>
            <SidebarGroup className="pb-0">
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      tooltip="Services"
                      className="text-muted-foreground [&_svg]:size-3.5 group-data-[collapsible=icon]:[&_svg]:size-4"
                    >
                      <Link to="/dashboard">
                        <ArrowLeftIcon />
                        <span>Services</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="truncate">
                {serviceQuery.data?.name ?? "Service"}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <NavMenu items={serviceItems(serviceId)} pathname={pathname} />
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : (
          <SidebarGroup>
            <SidebarGroupContent>
              <NavMenu items={globalItems} pathname={pathname} />
            </SidebarGroupContent>
          </SidebarGroup>
        )}
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
