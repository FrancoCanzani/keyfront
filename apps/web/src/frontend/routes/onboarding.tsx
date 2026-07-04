import { OnboardingPage } from "@/features/organization/onboarding";
import { authClient } from "@/lib/auth-client";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data) {
      throw redirect({ to: "/sign-in" });
    }
    if (data.session.activeOrganizationId) {
      throw redirect({
        to: "/$orgId/services",
        params: { orgId: data.session.activeOrganizationId },
      });
    }
  },
  component: OnboardingPage,
});
