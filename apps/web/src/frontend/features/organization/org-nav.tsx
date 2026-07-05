import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const TABS = [
  { value: "general", label: "General", to: "/$orgId/settings" as const },
  { value: "team", label: "Team", to: "/$orgId/team" as const },
] as const;

const tabClass =
  "-mb-px px-0.5 pb-2 pt-0.5 text-xs whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground";

export function OrgNav({
  orgId,
  className,
}: {
  orgId: string;
  className?: string;
}) {
  return (
    <nav
      aria-label="Organization"
      className={cn("flex gap-5 overflow-x-auto overflow-y-hidden", className)}
    >
      {TABS.map((item) => (
        <Link
          key={item.value}
          to={item.to}
          params={{ orgId }}
          activeOptions={
            item.value === "general"
              ? { exact: false, includeSearch: false }
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
