import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/$orgId/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/$orgId/services",
      params: { orgId: params.orgId },
    });
  },
});
