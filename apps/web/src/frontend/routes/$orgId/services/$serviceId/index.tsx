import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/form-layout";
import { gatewayDomain, serviceQuery } from "@/lib/gateway-queries";

export const Route = createFileRoute("/$orgId/services/$serviceId/")({
  component: ServiceOverview,
});

function ServiceOverview() {
  const { serviceId } = Route.useParams();
  const { data: service } = useSuspenseQuery(serviceQuery(serviceId));

  const curl = `curl http://${service.hostKey}.${gatewayDomain}/`;

  return (
    <FormSection
      title="Try it"
      description="Requests to the gateway URL are forwarded to your origin."
    >
      <div className="flex max-w-2xl items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-lg border bg-muted/40 px-3 py-2 font-mono text-xs tabular-nums">
          {curl}
        </code>
        <Button
          variant="outline"
          className="h-8 shrink-0"
          onClick={() => navigator.clipboard.writeText(curl)}
        >
          Copy
        </Button>
      </div>
    </FormSection>
  );
}
