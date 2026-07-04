import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useSession, signOut } from "@/lib/auth-client";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { data, isPending } = useSession();

  if (isPending) {
    return (
      <div className="grid min-h-svh place-items-center">
        <div className="size-5 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    );
  }

  if (!data) {
    return <Navigate to="/sign-in" />;
  }

  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          name: data.user.name || data.user.email,
          email: data.user.email,
        }}
        onSignOut={() => signOut()}
      />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
