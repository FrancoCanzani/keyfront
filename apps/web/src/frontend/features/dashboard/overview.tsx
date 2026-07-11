import { DashboardHeader } from "@/features/dashboard/dashboard-header";

export function Overview() {
  return <DashboardHeader breadcrumbs={[{ label: "Overview" }]} />;
}
