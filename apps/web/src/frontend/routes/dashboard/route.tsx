import { Dashboard } from "@/features/dashboard/dashboard";
import { authClient } from "@/lib/auth-client";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();

    if (!session) {
      throw redirect({ to: "/sign-in" });
    }
    if (!session.user.onboardedAt) {
      throw redirect({ to: "/onboarding" });
    }
  },
  component: Dashboard,
});
