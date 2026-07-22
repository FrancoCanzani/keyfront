import { BottomNav } from "@/features/dashboard/components/bottom-nav";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { Outlet } from "@tanstack/react-router";

export function Dashboard() {
  return (
    <div className="min-h-dvh">
      <DashboardHeader />
      <main className="mx-auto w-full max-w-4xl px-6 pb-24 md:pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
