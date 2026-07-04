import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
  nav,
  className,
}: {
  title: string | undefined;
  subtitle?: ReactNode;
  actions?: ReactNode;
  nav?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("shrink-0 bg-background", className)}>
      <header className="flex min-h-16 min-w-0 items-center gap-3 px-4 pb-3 pt-5">
        <div className="flex shrink-0 items-center md:hidden">
          <SidebarTrigger />
        </div>
        <div className="grid min-w-0 flex-1 gap-1.5">
          <h1 className="font-heading min-w-0 truncate text-lg leading-tight md:text-xl">
            {title ?? ""}
          </h1>
          {subtitle != null ? (
            <div className="min-w-0 truncate text-xs text-muted-foreground">
              {subtitle}
            </div>
          ) : null}
        </div>
        {actions != null ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {actions}
          </div>
        ) : null}
      </header>
      {nav != null ? (
        <div className="overflow-x-auto overflow-y-hidden px-4 pb-4">
          {nav}
        </div>
      ) : null}
    </div>
  );
}
