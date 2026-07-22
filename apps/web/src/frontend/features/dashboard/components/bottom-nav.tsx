import { cn } from "@/lib/utils";
import type { Icon } from "@phosphor-icons/react";
import { GearIcon, LinkIcon } from "@phosphor-icons/react";
import { Link, useLocation } from "@tanstack/react-router";

type NavItem = {
  label: string;
  icon: Icon;
  to: string;
};

const navItems: NavItem[] = [
  { label: "Links", icon: LinkIcon, to: "/dashboard" },
  { label: "Settings", icon: GearIcon, to: "/dashboard/settings" },
];

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 flex justify-center border-t bg-background pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2",
        "md:inset-x-auto md:bottom-6 md:left-1/2 md:-translate-x-1/2 md:rounded-full md:border md:bg-background/95 md:py-1.5 md:shadow-lg md:backdrop-blur-xl",
      )}
    >
      <div className="flex w-full max-w-xs items-center justify-around gap-1 px-2 md:w-auto md:gap-1 md:px-1">
        {navItems.map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.label}
              to={item.to}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-md px-4 py-1.5 text-xs text-muted-foreground md:flex-none md:flex-row md:gap-2 md:rounded-full md:px-4 md:py-1.5 md:text-sm",
                active ? "bg-muted text-foreground" : "hover:text-foreground",
              )}
            >
              <item.icon className="size-5 md:size-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
