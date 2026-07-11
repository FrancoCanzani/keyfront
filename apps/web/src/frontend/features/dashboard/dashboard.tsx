import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/features/dashboard/app-sidebar";

export function Dashboard() {
  return (
    <SidebarProvider collapsible="icon">
      <AppSidebar />
      <SidebarInset />
    </SidebarProvider>
  );
}
