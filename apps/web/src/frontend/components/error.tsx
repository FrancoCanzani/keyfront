import { Button } from "@/components/ui/button";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";

function messageFrom(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Something went wrong";
}

export function RouteError({ error, reset }: ErrorComponentProps) {
  const message = messageFrom(error);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 text-foreground">
      <p className="max-w-md text-center text-sm text-muted-foreground">
        {message}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => reset()}
        >
          Try again
        </Button>
        <Button type="button" variant="ghost" size="sm" asChild>
          <Link to="/">Back to app</Link>
        </Button>
      </div>
    </div>
  );
}
