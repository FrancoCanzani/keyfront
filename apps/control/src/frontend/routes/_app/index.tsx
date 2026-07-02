import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/")({
  component: Home,
});

function Home() {
  return (
    <div>
      <h1 className="text-lg font-medium">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Control plane is running. The Go data plane handles the proxy.
      </p>
    </div>
  );
}
