import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getRouteApi, Link, useRouterState } from "@tanstack/react-router";

const route = getRouteApi("/$orgId/services/$serviceId");

const TABS = [
  { value: "overview", label: "Overview", to: "/$orgId/services/$serviceId" as const, exact: true },
  { value: "settings", label: "Settings", to: "/$orgId/services/$serviceId/settings" as const },
  { value: "plans", label: "Plans", to: "/$orgId/services/$serviceId/plans" as const },
  { value: "keys", label: "Consumers & keys", to: "/$orgId/services/$serviceId/keys" as const },
  { value: "usage", label: "Usage", to: "/$orgId/services/$serviceId/usage" as const },
] as const;

function useServiceTab() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  if (pathname.endsWith("/settings")) return "settings";
  if (pathname.endsWith("/plans")) return "plans";
  if (pathname.endsWith("/keys")) return "keys";
  if (pathname.endsWith("/usage")) return "usage";
  return "overview";
}

export function ServiceNav() {
  const { orgId, serviceId } = route.useParams();
  const tab = useServiceTab();

  return (
    <Tabs value={tab}>
      <TabsList variant="line" className="h-auto w-max min-w-full justify-start">
        {TABS.map((item) => (
          <TabsTrigger key={item.value} value={item.value} asChild>
            <Link
              to={item.to}
              params={{ orgId, serviceId }}
              activeOptions={"exact" in item ? { exact: item.exact } : undefined}
            >
              {item.label}
            </Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
