import { cn } from "@/lib/utils";

export function UsageQuotaCell({
  monthCount,
  monthlyQuota,
}: {
  monthCount: number;
  monthlyQuota: number | null;
}) {
  if (monthlyQuota === null) {
    return <span className="text-muted-foreground">Unlimited</span>;
  }

  const pct = Math.min(100, Math.round((monthCount / monthlyQuota) * 100));

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <div className="flex h-1 min-w-0 flex-1 gap-px overflow-hidden rounded-sm bg-muted">
        {Array.from({ length: 10 }, (_, index) => (
          <div
            key={index}
            className={cn(
              "h-full flex-1",
              index < Math.ceil(pct / 10)
                ? pct >= 100
                  ? "bg-[#d03b3b]"
                  : "bg-foreground/70"
                : "bg-transparent",
            )}
          />
        ))}
      </div>
      <span className="font-data shrink-0 text-xxs text-muted-foreground tabular-nums">
        {pct}%
      </span>
    </div>
  );
}
