import { type CSSProperties, useState } from "react";
import { Outlet } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/features/dashboard/app-sidebar";

export function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <SidebarProvider
      collapsible="icon"
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
      className="!grid grid-cols-[minmax(0,1fr)] md:grid-cols-[var(--sidebar-layout-width)_minmax(0,1fr)]"
      style={
        {
          "--sidebar-layout-width": sidebarOpen
            ? "var(--sidebar-width)"
            : "var(--sidebar-width-icon)",
        } as CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
