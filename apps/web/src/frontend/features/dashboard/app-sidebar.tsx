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
import {
  Activity,
  Boxes,
  ChartNoAxesCombined,
  ChevronsUpDown,
  Gauge,
  KeyRound,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

const primaryItems = [
  { label: "Overview", icon: Gauge, active: true },
  { label: "Services", icon: Boxes },
  { label: "Consumers", icon: Users },
  { label: "API keys", icon: KeyRound },
  { label: "Request logs", icon: Activity },
];

const manageItems = [
  { label: "Usage", icon: ChartNoAxesCombined },
  { label: "Plans", icon: ShieldCheck },
];

export function AppSidebar() {
  const { data: session } = authClient.useSession();
  const name = session?.user.name || "Franco";
  const email = session?.user.email || "Personal workspace";

  async function signOut() {
    await authClient.signOut();
    window.location.replace("/sign-in");
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex h-8 items-center group-data-[collapsible=icon]:justify-center gap-2">
          <span className="min-w-0 flex-1 truncate font-medium group-data-[collapsible=icon]:hidden">
            Keyfront
          </span>
          <SidebarTrigger className="*:size-3.5 group-data-[collapsible=icon]:*:size-4" />
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {primaryItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    tooltip={item.label}
                    isActive={item.active}
                    className="[&_svg]:size-3.5 group-data-[collapsible=icon]:[&_svg]:size-4"
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Manage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {manageItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    tooltip={item.label}
                    className="[&_svg]:size-3.5 group-data-[collapsible=icon]:[&_svg]:size-4"
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
                    <UserRound className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="block truncate">{name}</span>
                    <span className="block truncate text-muted-foreground">
                      {email}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto group-data-[collapsible=icon]:hidden" />
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
