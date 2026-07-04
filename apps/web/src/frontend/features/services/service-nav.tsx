import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const TABS = [
  { value: "overview", label: "Overview", to: "/$orgId/services/$serviceId" as const, exact: true },
  { value: "plans", label: "Plans", to: "/$orgId/services/$serviceId/plans" as const },
  { value: "keys", label: "Consumers & keys", to: "/$orgId/services/$serviceId/keys" as const },
  { value: "usage", label: "Usage", to: "/$orgId/services/$serviceId/usage" as const },
  { value: "settings", label: "Settings", to: "/$orgId/services/$serviceId/settings" as const },
] as const;

const tabClass =
  "-mb-px px-0.5 pb-3 pt-1 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground";

export function ServiceNav({
  orgId,
  serviceId,
  className,
}: {
  orgId: string;
  serviceId: string;
  className?: string;
}) {
  return (
    <nav
      aria-label="Service"
      className={cn("flex gap-6 overflow-x-auto overflow-y-hidden", className)}
    >
      {TABS.map((item) => (
        <Link
          key={item.value}
          to={item.to}
          params={{ orgId, serviceId }}
          activeOptions={"exact" in item ? { exact: item.exact } : undefined}
          className={tabClass}
          inactiveProps={{ className: "border-b-2 border-transparent" }}
          activeProps={{
            className: "border-b-[3px] border-neutral-950 dark:border-neutral-50",
          }}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
