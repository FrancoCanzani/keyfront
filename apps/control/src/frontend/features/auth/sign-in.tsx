import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SignIn() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await authClient.signIn.magicLink({ email, callbackURL: "/" });
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="grid min-h-svh place-items-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-lg font-medium">Sign in</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          We'll email you a magic link.
        </p>
        {sent ? (
          <p className="text-sm text-muted-foreground">
            Check your email for the link (in dev it's printed to the server
            console).
          </p>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" disabled={loading}>
              {loading ? "Sending…" : "Send magic link"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
