import { AppSidebar, type AppShellUser } from "@/components/app-sidebar";
import { SettingsSidebar } from "@/components/settings-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useSelectedSidebarPath } from "@/hooks/use-selected-sidebar-path";
import { authClient } from "@/lib/auth-client";
import { getRouteApi, Outlet, useNavigate } from "@tanstack/react-router";

const orgRouteApi = getRouteApi("/$orgId");

export function AuthShell() {
  const { user } = orgRouteApi.useRouteContext();
  const shellUser: AppShellUser = {
    name: user.name || user.email,
    email: user.email,
  };
  const navigate = useNavigate();
  const { selectedPath } = useSelectedSidebarPath();
  const inSettings =
    selectedPath === "/settings" ||
    selectedPath.startsWith("/settings/") ||
    selectedPath === "/team" ||
    selectedPath.startsWith("/team/");

  async function signOut() {
    await authClient.signOut();
    navigate({ to: "/sign-in" });
  }

  return (
    <SidebarProvider collapsible="none" className="h-svh">
      {inSettings ? (
        <SettingsSidebar />
      ) : (
        <AppSidebar user={shellUser} onSignOut={signOut} />
      )}
      <SidebarInset className="overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
