import { useState } from "react";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import type { InferResponseType } from "hono/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GatewaySnippets,
  gatewayUrl,
} from "@/features/services/gateway-snippets";
import { readApiError, serviceQuery } from "@/lib/gateway-queries";
import { client } from "@/lib/rpc";
import { cn } from "@/lib/utils";

const route = getRouteApi("/$orgId/services/$serviceId/test");

type TestResult = InferResponseType<typeof client.api.test.$post, 200>;
type TestKey = InferResponseType<typeof client.api.test.key.$post, 201>;
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

const controlHeight =
  "h-7 min-h-7 box-border shrink-0 py-0 text-[11px] leading-7";

const pillClass = cn(
  "inline-flex items-center justify-center rounded border border-border bg-muted/40 px-2.5 font-normal transition-colors hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-50",
  controlHeight,
);

const fieldClass = cn(
  "min-w-0 rounded border border-border bg-muted/40 px-2 font-data outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
  controlHeight,
);

const codeFieldClass = cn(
  "flex min-w-0 flex-1 items-center overflow-x-auto rounded border border-border bg-muted/40 px-2.5 font-data",
  controlHeight,
);

const textareaClass =
  "min-h-28 w-full min-w-0 max-w-full resize-y rounded border border-border bg-muted/40 px-2.5 py-2 font-data text-[11px] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

const responsePanelClass =
  "min-h-[min(32rem,60vh)] overflow-auto rounded border border-border bg-muted/40 px-2.5 py-2 font-data text-[11px] leading-relaxed";

export function ServiceTestPage() {
  const { serviceId } = route.useParams();
  const { data: service } = useSuspenseQuery(serviceQuery(serviceId));
  const url = gatewayUrl(service.hostKey);

  const [apiKey, setApiKey] = useState("");
  const [method, setMethod] = useState<(typeof METHODS)[number]>("GET");
  const [path, setPath] = useState("/");
  const [headers, setHeaders] = useState("{}");
  const [body, setBody] = useState("");

  const createKey = useMutation({
    mutationFn: async (): Promise<TestKey> => {
      const res = await client.api.test.key.$post({ json: { serviceId } });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Could not create testing key"));
      }
      return res.json();
    },
    onSuccess: ({ key }) => {
      setApiKey(key);
      send.reset();
      toast.success("Testing key created");
    },
    onError: (error) => toast.error(error.message),
  });

  const send = useMutation({
    mutationFn: async (): Promise<TestResult> => {
      let parsedHeaders: unknown;
      try {
        parsedHeaders = JSON.parse(headers);
      } catch {
        throw new Error("Headers must be a valid JSON object");
      }
      if (
        !parsedHeaders ||
        Array.isArray(parsedHeaders) ||
        typeof parsedHeaders !== "object" ||
        Object.values(parsedHeaders).some((value) => typeof value !== "string")
      ) {
        throw new Error("Header names and values must be strings");
      }
      const res = await client.api.test.$post({
        json: {
          serviceId,
          apiKey,
          method,
          path,
          headers: parsedHeaders as Record<string, string>,
          body: body || null,
        },
      });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Test request failed"));
      }
      return res.json();
    },
    onError: (error) => toast.error(error.message),
  });
  const result = send.data;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="grid items-start gap-y-10 lg:grid-cols-2 lg:gap-x-12 lg:gap-y-0">
        <div className="grid gap-10">
          <section className="grid min-w-0 gap-3">
            <SectionHeading
              title="Endpoint"
              description="Authenticated requests to this URL are forwarded to your origin."
            />
            <div className="flex min-w-0 items-center gap-2">
              <code className={codeFieldClass}>{url}</code>
              <button
                type="button"
                className={pillClass}
                onClick={() => {
                  navigator.clipboard.writeText(url);
                  toast.success("Copied to clipboard");
                }}
              >
                Copy
              </button>
            </div>
          </section>

          <section className="grid min-w-0 gap-3">
            <SectionHeading
              title="Examples"
              description="Quick start snippets for your gateway."
            />
            <GatewaySnippets hostKey={service.hostKey} />
          </section>

          <form
            className="m-0 grid min-w-0 gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              send.mutate();
            }}
          >
            <SectionHeading
              title="Request"
              description="Paste an API key to send a live request."
            />
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <input
                type="password"
                className={cn(fieldClass, "w-full")}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="API key"
              />
              <button
                type="button"
                className={pillClass}
                disabled={createKey.isPending}
                onClick={() => createKey.mutate()}
              >
                {createKey.isPending
                  ? "Creating…"
                  : createKey.data
                    ? "Rotate key"
                    : "Create key"}
              </button>
            </div>
            {createKey.data ? (
              <p className="text-[11px] text-muted-foreground">
                Expires in one hour. Creating another invalidates it.
              </p>
            ) : null}
            <div className="grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-2">
              <Select
                value={method}
                onValueChange={(value) => setMethod(value as typeof method)}
              >
                <SelectTrigger
                  size="sm"
                  className={cn(fieldClass, "w-full shadow-none")}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map((item) => (
                    <SelectItem key={item} value={item} className="font-data text-xs">
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                className={cn(fieldClass, "w-full")}
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/"
              />
            </div>
            <label className="grid min-w-0 gap-1.5">
              <span className="text-[11px] text-muted-foreground">
                Headers (JSON)
              </span>
              <textarea
                className={textareaClass}
                value={headers}
                onChange={(e) => setHeaders(e.target.value)}
                placeholder="{}"
                spellCheck={false}
              />
            </label>
            <label className="grid min-w-0 gap-1.5">
              <span className="text-[11px] text-muted-foreground">Body</span>
              <textarea
                className={textareaClass}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder='{"message":"hello"}'
                spellCheck={false}
                disabled={method === "GET"}
              />
            </label>
            <div className="flex justify-end">
              <button
                type="submit"
                className={cn(
                  pillClass,
                  "border-foreground/20 bg-foreground text-background hover:bg-foreground/90",
                )}
                disabled={!apiKey || !path.startsWith("/") || send.isPending}
              >
                {send.isPending ? "Testing…" : "Test request"}
              </button>
            </div>
          </form>
        </div>

        <div className="grid min-w-0 gap-3">
          <SectionHeading
            title="Response"
            description="Formatted JSON from the gateway."
          />
          <ResponsePanel result={result} pending={send.isPending} />
        </div>
      </div>
    </div>
  );
}

function ResponsePanel({
  result,
  pending,
}: {
  result: TestResult | undefined;
  pending: boolean;
}) {
  if (pending) {
    return (
      <pre className={cn(responsePanelClass, "text-muted-foreground")}>
        Testing…
      </pre>
    );
  }

  if (!result) {
    return (
      <pre className={cn(responsePanelClass, "text-muted-foreground")}>
        Send a request to see the response.
      </pre>
    );
  }

  const formatted = formatResponseJson(result);
  const status = result.ok ? result.status : null;

  return (
    <div className="grid min-w-0 gap-2">
      {status !== null ? (
        <div className="flex flex-wrap items-center gap-3 font-data text-[11px]">
          <span
            className={
              status >= 400
                ? "font-medium text-destructive"
                : "font-medium text-[#16a34a]"
            }
          >
            {status}
          </span>
          <span className="text-muted-foreground">{result.ok ? result.ms : 0} ms</span>
        </div>
      ) : null}
      <pre className={responsePanelClass}>{formatted}</pre>
    </div>
  );
}

function formatResponseJson(result: TestResult): string {
  if (!result.ok) {
    return JSON.stringify({ error: result.error }, null, 2);
  }

  let parsedBody: unknown = null;
  if (result.body) {
    try {
      parsedBody = JSON.parse(result.body);
    } catch {
      parsedBody = result.body;
    }
  }

  const payload: Record<string, unknown> = {
    status: result.status,
    ms: result.ms,
    body: parsedBody,
  };

  if (result.rateLimit !== null) {
    payload.rateLimit = result.rateLimit;
    payload.rateRemaining = result.rateRemaining;
  }
  if (result.quotaLimit !== null) {
    payload.quotaLimit = result.quotaLimit;
    payload.quotaRemaining = result.quotaRemaining;
  }

  return JSON.stringify(payload, null, 2);
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <h2 className="m-0 text-xs leading-snug">
      <span className="font-medium text-foreground">{title}.</span>{" "}
      <span className="text-muted-foreground">{description}</span>
    </h2>
  );
}
