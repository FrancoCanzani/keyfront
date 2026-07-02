import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

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
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <span className="text-sm font-medium">api-gateway</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{data.user.email}</span>
          <Button variant="outline" size="sm" onClick={() => signOut()}>
            Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
