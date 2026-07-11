import { Onboarding } from "@/features/onboarding/onboarding";
import { authClient } from "@/lib/auth-client";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/onboarding")({
  loader: async () => {
    const { data: session } = await authClient.getSession();

    if (!session) {
      throw redirect({ to: "/sign-in" });
    }
    if (session.user.onboardedAt) {
      throw redirect({ to: "/dashboard" });
    }

    return {
      organizationId: session.session.activeOrganizationId,
      name: session.user.name,
    };
  },
  component: Onboarding,
});
