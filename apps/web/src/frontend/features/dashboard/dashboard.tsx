import type { CSSProperties } from "react";
import { Outlet } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/features/dashboard/components/app-sidebar";

export function Dashboard() {
  return (
    <SidebarProvider
      defaultOpen={false}
      style={{ "--sidebar-width": "13rem" } as CSSProperties}
    >
      <AppSidebar />
      <SidebarInset>
        <header className="absolute inset-x-0 top-0 z-20 flex h-12 items-center px-4 md:hidden">
          <SidebarTrigger />
        </header>
        <div className="mx-auto w-full max-w-5xl px-6 pt-12 md:pt-0">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
