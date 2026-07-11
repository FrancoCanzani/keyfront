import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function Landing() {
  const { data: session, isPending } = authClient.useSession();

  return (
    <main className="min-h-dvh bg-background">
      <header className="flex h-16 items-center justify-between px-6 sm:px-8">
        <span className="text-sm tracking-[-0.02em]">Keyfront</span>
        <Button asChild variant="outline" size="sm">
          <Link to={session ? "/dashboard" : "/sign-in"} disabled={isPending}>
            {session ? "Dashboard" : "Sign in"}
          </Link>
        </Button>
      </header>
    </main>
  );
}
