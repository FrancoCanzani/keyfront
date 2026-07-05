import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  GatewaySnippets,
  gatewayUrl,
} from "@/features/services/gateway-snippets";

export function TestDialog({ hostKey }: { hostKey: string }) {
  const url = gatewayUrl(hostKey);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-8 shrink-0">
          Test
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Your gateway endpoint</DialogTitle>
          <DialogDescription>
            Authenticated requests to this URL are forwarded to your origin.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded-lg border bg-muted/40 px-3 py-2 font-mono text-xs tabular-nums">
            {url}
          </code>
          <Button
            variant="outline"
            className="h-8 shrink-0"
            onClick={() => {
              navigator.clipboard.writeText(url);
              toast.success("Copied to clipboard");
            }}
          >
            Copy
          </Button>
        </div>
        <GatewaySnippets hostKey={hostKey} />
      </DialogContent>
    </Dialog>
  );
}
