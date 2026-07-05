import { cn } from "@/lib/utils";

export function statusBadgeClassName(status: number) {
  if (status >= 500) return "bg-[#d03b3b]/10 text-[#d03b3b]";
  if (status >= 400) return "bg-[#ec835a]/10 text-[#ec835a]";
  return "bg-[#15803d]/10 text-[#15803d]";
}

export function StatusBadge({ status }: { status: number }) {
  return (
    <span
      className={cn(
        "inline-flex rounded px-1.5 py-0.5 font-data text-xxs tabular-nums",
        statusBadgeClassName(status),
      )}
    >
      {status}
    </span>
  );
}
