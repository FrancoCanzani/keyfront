import { Button } from "@/components/ui/button";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useState } from "react";

export function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 rounded-md border bg-muted/50 py-1 pr-1 pl-3">
        <code className="min-w-0 flex-1 truncate font-mono text-xs">
          {value}
        </code>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          aria-label={`Copy ${label.toLowerCase()}`}
          onClick={() => void copy()}
        >
          {copied ? <CheckIcon className="text-green-600" /> : <CopyIcon />}
        </Button>
      </div>
    </div>
  );
}
