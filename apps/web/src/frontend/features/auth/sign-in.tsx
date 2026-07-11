import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { type SyntheticEvent, useState } from "react";

export function SignIn() {
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const result = await authClient.signIn.magicLink({
      email,
      callbackURL: "/dashboard",
    });

    setIsSubmitting(false);

    if (result.error) {
      setError(
        result.error.message ?? "We couldn't send the sign-in link. Try again.",
      );
      return;
    }

    setSubmittedEmail(email);
  }

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="absolute left-6 top-6 sm:left-8 sm:top-8">
        <span className="text-sm tracking-[-0.02em]">Keyfront</span>
      </div>

      <div className="flex min-h-dvh items-center justify-center px-6 py-28">
        <section className="w-full max-w-84">
          {submittedEmail ? (
            <div>
              <h1 className="text-2xl font-medium leading-tight">
                Check your inbox
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                We sent a secure sign-in link to{" "}
                <span className="font-medium text-foreground">
                  {submittedEmail}
                </span>
                .
              </p>
              <div className="mt-4 border-t pt-4">
                <p className="text-xs leading-5 text-muted-foreground">
                  It may take a moment to arrive. The link can only be used
                  once.
                </p>
                <Button
                  type="button"
                  variant="link"
                  className="mt-2 h-auto p-0 text-xs"
                  onClick={() => setSubmittedEmail("")}
                >
                  Use another email
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-medium leading-tight">
                Welcome back
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Sign in to manage your gateways, keys, and traffic.
              </p>

              <form className="mt-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email">Work email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@company.com"
                    aria-invalid={Boolean(error)}
                    className="w-full"
                  />
                  {error ? (
                    <p className="text-xs leading-5 text-destructive">
                      {error}
                    </p>
                  ) : null}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  className="mt-2 w-full"
                >
                  {isSubmitting ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <>
                      Continue with email
                      <ArrowRight className="ml-auto size-3.5 opacity-65" />
                    </>
                  )}
                </Button>
              </form>

              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                By continuing, you agree to the Terms of Service and Privacy
                Policy.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
