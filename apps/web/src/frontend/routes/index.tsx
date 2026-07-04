import { authClient } from "@/lib/auth-client";
import { isValidPostAuthRedirect } from "@/lib/auth-redirect";
import { postAuthRedirectTarget } from "@/lib/post-auth-redirect";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/")({
  validateSearch: searchSchema,
  beforeLoad: async ({ search }) => {
    const { data } = await authClient.getSession();
    if (data) {
      const redirectTo =
        search.redirect && isValidPostAuthRedirect(search.redirect)
          ? search.redirect
          : undefined;
      throw redirect(await postAuthRedirectTarget(data, redirectTo));
    }
  },
  component: HomePage,
});

function HomePage() {
  return (
    <div className="grid min-h-svh place-items-center px-4">
      <div className="text-center">
        <h1 className="text-lg font-medium">api-gateway</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          API keys, rate limiting, and usage for your APIs.
        </p>
        <Link
          to="/sign-in"
          className="mt-4 inline-block text-sm underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
