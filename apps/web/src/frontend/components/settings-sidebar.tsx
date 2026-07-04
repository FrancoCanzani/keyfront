import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useSelectedSidebarPath } from "@/hooks/use-selected-sidebar-path";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, SlidersHorizontal, Users } from "lucide-react";

const SETTINGS_NAV = [
  { to: "/$orgId/settings", label: "General", icon: SlidersHorizontal },
  { to: "/$orgId/team", label: "Team", icon: Users },
] as const;

const sidebarItemClassName =
  "h-8 min-h-8 !text-sm font-normal data-active:font-normal [&_svg]:!size-3.5";

export function SettingsSidebar() {
  const { orgId } = useParams({ from: "/$orgId" });
  const { selectedPath } = useSelectedSidebarPath();

  function isActive(to: string) {
    const target = to.replace("/$orgId", "") || "/";
    if (target === "/settings") {
      return selectedPath === "/settings";
    }
    return selectedPath === target || selectedPath.startsWith(`${target}/`);
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className={sidebarItemClassName}>
              <Link to="/$orgId/services" params={{ orgId }}>
                <ArrowLeft className="shrink-0 text-sidebar-foreground" />
                <span className="truncate font-medium">Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {SETTINGS_NAV.map((item) => {
                const Icon = item.icon;
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
    </Sidebar>
  );
}
