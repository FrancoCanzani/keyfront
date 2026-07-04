import { UserMenu, type UserMenuUser } from "@/components/user-menu";
import { DashboardBreadcrumbs } from "@/components/dashboard-chrome";

export function AppTopBar({
  orgId,
  orgName,
  user,
  serviceName,
  onSignOut,
}: {
  orgId: string;
  orgName: string;
  user: UserMenuUser;
  serviceName?: string;
  onSignOut: () => void | Promise<void>;
}) {
  return (
    <header className="flex min-h-10 min-w-0 items-center gap-4">
      <DashboardBreadcrumbs
        orgId={orgId}
        orgName={orgName}
        serviceName={serviceName}
      />
      <UserMenu orgId={orgId} user={user} onSignOut={onSignOut} />
    </header>
  );
}
