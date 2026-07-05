import { cn } from "@/lib/utils";

const METHOD_CLASS: Record<string, string> = {
  GET: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  POST: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  PUT: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  PATCH: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  DELETE: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  HEAD: "bg-muted text-muted-foreground",
  OPTIONS: "bg-muted text-muted-foreground",
};

export function MethodBadge({ method }: { method: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded px-1.5 py-0.5 font-data text-xxs uppercase",
        METHOD_CLASS[method] ?? "bg-muted/60 text-muted-foreground",
      )}
    >
      {method}
    </span>
  );
}
