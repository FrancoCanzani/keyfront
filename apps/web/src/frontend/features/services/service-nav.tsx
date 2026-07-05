import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const TABS = [
  { value: "usage", label: "Usage", to: "/$orgId/services/$serviceId" as const },
  { value: "plans", label: "Plans", to: "/$orgId/services/$serviceId/plans" as const },
  { value: "keys", label: "Consumers & keys", to: "/$orgId/services/$serviceId/keys" as const },
  { value: "logs", label: "Logs", to: "/$orgId/services/$serviceId/logs" as const },
  { value: "test", label: "Test", to: "/$orgId/services/$serviceId/test" as const },
  { value: "reference", label: "Reference", to: "/$orgId/services/$serviceId/reference" as const },
  { value: "settings", label: "Settings", to: "/$orgId/services/$serviceId/settings" as const },
] as const;

const tabClass =
  "-mb-px px-0.5 pb-2 pt-0.5 text-xs whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground";

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
      className={cn("flex gap-5 overflow-x-auto overflow-y-hidden", className)}
    >
      {TABS.map((item) => (
        <Link
          key={item.value}
          to={item.to}
          params={{ orgId, serviceId }}
          activeOptions={
            item.value === "usage"
              ? { exact: true, includeSearch: false }
              : undefined
          }
          className={tabClass}
          inactiveProps={{ className: "border-b-2 border-transparent" }}
          activeProps={{
            className:
              "border-b-2 border-neutral-950 text-foreground dark:border-neutral-50",
          }}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
