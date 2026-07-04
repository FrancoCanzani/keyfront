import { Link } from "@tanstack/react-router";

export function HomePage() {
  return (
    <div className="grid min-h-svh place-items-center px-4">
      <div className="text-center">
        <h1 className="text-lg font-medium">Keyfront</h1>
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
