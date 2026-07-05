import { cn } from "@/lib/utils";

export function UsageStatusBar({
  ok,
  err4,
  err5,
}: {
  ok: number;
  err4: number;
  err5: number;
}) {
  const total = ok + err4 + err5;
  if (total === 0) return null;

  const segments = [
    { value: ok, className: "bg-[#15803d]" },
    { value: err4, className: "bg-[#ec835a]" },
    { value: err5, className: "bg-[#d03b3b]" },
  ].filter((segment) => segment.value > 0);

  return (
    <div className="flex h-1 min-w-24 max-w-40 gap-px overflow-hidden rounded-none bg-muted">
      {segments.map((segment) => (
        <div
          key={segment.className}
          className={cn("h-full min-w-0.5", segment.className)}
          style={{ flexGrow: segment.value, flexBasis: 0 }}
        />
      ))}
    </div>
  );
}
