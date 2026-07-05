import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { servicesQuery } from "@/lib/gateway-queries";

export type UsageRange = "24h" | "7d" | "30d";

export const RANGE_LABELS: Record<UsageRange, string> = {
  "24h": "24 hours",
  "7d": "7 days",
  "30d": "30 days",
};

export function ServiceSwitcher({
  orgId,
  serviceId,
  serviceName,
  range,
  onRangeChange,
}: {
  orgId: string;
  serviceId: string;
  serviceName: string;
  range: UsageRange;
  onRangeChange: (range: UsageRange) => void;
}) {
  const navigate = useNavigate();
  const { data: services } = useSuspenseQuery(servicesQuery);

  return (
    <nav
      aria-label="Service context"
      className="font-data flex min-w-0 flex-wrap items-center gap-1.5 text-xs"
    >
      <span className="text-muted-foreground">Usage</span>
      <span className="text-muted-foreground">/</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex max-w-48 items-center gap-1 truncate rounded border border-border bg-muted/40 px-2 py-0.5 font-normal text-foreground hover:bg-muted/60"
          >
            <span className="truncate">{serviceName}</span>
            <ChevronsUpDown className="size-3 shrink-0 opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-52 w-56 p-1 text-xs">
          <DropdownMenuLabel className="px-2 py-1 text-[11px] font-normal text-muted-foreground">
            Services
          </DropdownMenuLabel>
          {services.map((service) => {
            const active = service.id === serviceId;
            return (
              <DropdownMenuItem
                key={service.id}
                className="min-h-7 px-2 py-1 font-normal"
                disabled={active}
                onClick={() =>
                  navigate({
                    to: "/$orgId/services/$serviceId",
                    params: { orgId, serviceId: service.id },
                    search: { range },
                  })
                }
              >
                <span className="truncate">{service.name}</span>
                {active ? <span className="ml-auto text-[11px]">✓</span> : null}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="min-h-7 px-2 py-1 font-normal" asChild>
            <Link to="/$orgId/services" params={{ orgId }}>
              All services
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <span className="text-muted-foreground">/</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded border border-border bg-muted/40 px-2 py-0.5 font-normal text-foreground hover:bg-muted/60"
          >
            <span>{RANGE_LABELS[range]}</span>
            <ChevronsUpDown className="size-3 shrink-0 opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-40 p-1 text-xs">
          <DropdownMenuLabel className="px-2 py-1 text-[11px] font-normal text-muted-foreground">
            Range
          </DropdownMenuLabel>
          {(Object.entries(RANGE_LABELS) as [UsageRange, string][]).map(
            ([value, label]) => {
              const active = value === range;
              return (
                <DropdownMenuItem
                  key={value}
                  className="min-h-7 px-2 py-1 font-normal"
                  disabled={active}
                  onClick={() => onRangeChange(value)}
                >
                  <span>{label}</span>
                  {active ? <span className="ml-auto text-[11px]">✓</span> : null}
                </DropdownMenuItem>
              );
            },
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
