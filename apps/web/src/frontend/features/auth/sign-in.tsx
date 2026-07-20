import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { getRouteApi } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { type SyntheticEvent, useState } from "react";

const route = getRouteApi("/sign-in");

export function SignIn() {
  const { redirect } = route.useSearch();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const result = await authClient.signIn.magicLink({
      email,
      callbackURL: redirect ?? "/dashboard",
    });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error.message ?? "Something went wrong.");
      return;
    }

    setSent(true);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-64">
        {sent ? (
          <p className="text-sm text-muted-foreground">
            Check your email for a sign-in link.
          </p>
        ) : (
          <form className="space-y-2" onSubmit={handleSubmit}>
            <Input
              type="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              aria-invalid={Boolean(error)}
            />
            {error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : null}
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                "Continue with email"
              )}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
