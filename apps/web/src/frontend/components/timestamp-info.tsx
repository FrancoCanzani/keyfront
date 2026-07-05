import { useState } from "react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type DisplayType = "time" | "datetime" | "relative";

function formatRelative(ts: number): string {
  const diffSec = Math.round((ts - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (Math.abs(diffSec) < 60) return rtf.format(diffSec, "second");
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, "hour");
  const diffDay = Math.round(diffHour / 24);
  return rtf.format(diffDay, "day");
}

function formatUtc(ts: number): string {
  const date = new Date(ts);
  return date.toISOString().replace("T", " ").slice(0, 19);
}

function formatLocal(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDisplay(ts: number, displayType: DisplayType): string {
  switch (displayType) {
    case "time":
      return new Date(ts).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      });
    case "datetime":
      return new Date(ts).toLocaleString();
    case "relative":
      return formatRelative(ts);
    default: {
      const _exhaustive: never = displayType;
      return _exhaustive;
    }
  }
}

function TooltipRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="flex w-full items-center px-2 py-1 text-left text-xs hover:bg-muted/60"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(value);
        setCopied(true);
        toast.success("Copied to clipboard");
        setTimeout(() => setCopied(false), 1000);
      }}
    >
      <span className="w-20 shrink-0 truncate text-xxs text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "ml-1.5 min-w-0 truncate font-data text-xxs tabular-nums",
          copied ? "text-[#15803d]" : "text-foreground",
        )}
      >
        {copied ? "Copied!" : value}
      </span>
    </button>
  );
}

export function TimestampInfo({
  value,
  className,
  displayType = "time",
  side = "right",
}: {
  value: number;
  className?: string;
  displayType?: DisplayType;
  side?: "left" | "right" | "top" | "bottom";
}) {
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const utc = formatUtc(value);
  const local = formatLocal(value);
  const relative = formatRelative(value);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
      className={cn(
        "font-data tabular-nums underline decoration-dotted decoration-border underline-offset-2 hover:text-foreground",
        className ?? "text-xs",
      )}
          onClick={(e) => e.stopPropagation()}
        >
          {formatDisplay(value, displayType)}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        align="start"
        sideOffset={4}
        className="w-auto min-w-[13rem] border border-border bg-background p-0 text-xs text-foreground shadow-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="py-0.5">
          <TooltipRow label="UTC" value={utc} />
          <TooltipRow label={localTimezone} value={local} />
          <TooltipRow label="Relative" value={relative} />
          <TooltipRow label="Timestamp" value={String(value)} />
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
