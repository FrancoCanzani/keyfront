import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DashboardHeader } from "@/features/dashboard/dashboard-header";
import { plansQueryOptions } from "@/features/plans/queries";
import { serviceQueryOptions } from "@/features/services/queries";
import { client } from "@/lib/api";
import { cn } from "@/lib/utils";
import { XIcon } from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import type { InferResponseType } from "hono/client";
import { useState } from "react";
import { toast } from "sonner";

const route = getRouteApi("/dashboard/services/$serviceId/playground");

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type HeaderRow = { name: string; value: string };
type PlaygroundResponse = InferResponseType<
  (typeof client.api.playground)["$post"],
  200
>;

type HistoryEntry = {
  method: Method;
  path: string;
  status: number;
  durationMs: number;
  headers: HeaderRow[];
  body: string;
};

const methods: Method[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const bodyMethods = new Set<Method>(["POST", "PUT", "PATCH"]);

function statusTone(status: number) {
  if (status >= 200 && status < 300) {
    return "text-emerald-600 dark:text-emerald-400";
  }
  if (status === 429) {
    return "text-destructive";
  }
  if (status >= 400) {
    return "text-amber-600 dark:text-amber-400";
  }
  return "text-muted-foreground";
}

function prettyBody(body: string) {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

function findHeader(response: PlaygroundResponse, name: string) {
  return response.headers.find(
    (header) => header.name.toLowerCase() === name,
  )?.value;
}

export function PlaygroundPage() {
  const { serviceId } = route.useParams();
  return <Playground key={serviceId} serviceId={serviceId} />;
}

function Playground({ serviceId }: { serviceId: string }) {
  const serviceQuery = useQuery(serviceQueryOptions(serviceId));
  const plansQuery = useQuery(plansQueryOptions(serviceId));
  const queryClient = useQueryClient();

  const [method, setMethod] = useState<Method>("GET");
  const [path, setPath] = useState("/");
  const [headerRows, setHeaderRows] = useState<HeaderRow[]>([]);
  const [body, setBody] = useState("");
  const [apiKey, setApiKey] = useState(
    () => sessionStorage.getItem(`playground-key-${serviceId}`) ?? "",
  );
  const [response, setResponse] = useState<PlaygroundResponse | null>(null);
  const [burst, setBurst] = useState<number[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const host = serviceQuery.data?.host;
  const firstPlan = plansQuery.data?.[0];

  function updateApiKey(value: string) {
    setApiKey(value);
    sessionStorage.setItem(`playground-key-${serviceId}`, value);
  }

  async function generateKey() {
    if (!firstPlan) {
      return;
    }
    setGenerating(true);
    try {
      const res = await client.api.keys.$post({
        json: {
          name: "Playground",
          serviceId,
          identityId: null,
          planId: firstPlan.id,
          environment: "test",
        },
      });
      if (!res.ok) {
        throw new Error("Failed to generate key");
      }
      const data = await res.json();
      updateApiKey(data.plaintext);
      await queryClient.invalidateQueries({ queryKey: ["keys"] });
      toast.success(`Test key ready on the ${firstPlan.name} plan`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate key",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function fire() {
    const res = await client.api.playground.$post({
      json: {
        serviceId,
        method,
        path,
        headers: headerRows.filter((row) => row.name.trim()),
        body: bodyMethods.has(method) ? body : undefined,
        apiKey,
      },
    });
    if (!res.ok) {
      const failure = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(failure?.error ?? "Request failed");
    }
    return res.json();
  }

  async function send() {
    if (!apiKey.trim()) {
      toast.error("Add an API key first");
      return;
    }
    setBusy(true);
    setBurst(null);
    try {
      const result = await fire();
      setResponse(result);
      setHistory((previous) =>
        [
          {
            method,
            path,
            status: result.status,
            durationMs: result.durationMs,
            headers: headerRows,
            body,
          },
          ...previous,
        ].slice(0, 20),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  async function sendBurst() {
    if (!apiKey.trim()) {
      toast.error("Add an API key first");
      return;
    }
    setBusy(true);
    setBurst([]);
    try {
      const statuses: number[] = [];
      for (let i = 0; i < 25; i++) {
        const result = await fire();
        statuses.push(result.status);
        setBurst([...statuses]);
        setResponse(result);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Burst failed");
    } finally {
      setBusy(false);
    }
  }

  function restore(entry: HistoryEntry) {
    setMethod(entry.method);
    setPath(entry.path);
    setHeaderRows(entry.headers);
    setBody(entry.body);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DashboardHeader
        breadcrumbs={[
          { label: "Services", href: "/dashboard" },
          {
            label: serviceQuery.data?.name ?? "Service",
            href: `/dashboard/services/${serviceId}`,
            serviceId,
          },
          { label: "Playground" },
        ]}
      />

      <div className="shrink-0 border-b bg-background px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center rounded-md border focus-within:ring-1 focus-within:ring-ring">
            <Select
              value={method}
              onValueChange={(value) => setMethod(value as Method)}
            >
              <SelectTrigger
                size="sm"
                className="w-24 shrink-0 rounded-none border-0 font-mono text-xs shadow-none focus-visible:ring-0"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {methods.map((item) => (
                  <SelectItem key={item} value={item} className="font-mono">
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="hidden max-w-44 shrink-0 truncate border-l px-2 font-mono text-xs text-muted-foreground md:block">
              {host ?? "…"}
            </span>
            <Input
              value={path}
              onChange={(event) => setPath(event.target.value)}
              placeholder="/v1/users"
              className="flex-1 border-0 font-mono text-sm shadow-none focus-visible:ring-0"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void send();
                }
              }}
            />
          </div>
          <Button size="sm" disabled={busy} onClick={() => void send()}>
            Send
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void sendBurst()}
          >
            Burst x25
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-0 lg:divide-x">
          <section className="space-y-6 lg:pr-6">
            <div className="space-y-2">
              <div className="flex h-7 items-center justify-between">
                <Label className="text-muted-foreground">API key</Label>
                {firstPlan ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={generating}
                    onClick={() => void generateKey()}
                  >
                    {generating ? "Generating..." : "Generate test key"}
                  </Button>
                ) : null}
              </div>
              <Input
                type="password"
                value={apiKey}
                onChange={(event) => updateApiKey(event.target.value)}
                placeholder="kf_test_..."
                autoComplete="off"
                className="w-full font-mono text-xs"
              />
              {plansQuery.data && plansQuery.data.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Keys need a plan.{" "}
                  <Link
                    to="/dashboard/services/$serviceId/plans/new"
                    params={{ serviceId }}
                    className="underline underline-offset-2"
                  >
                    Create one
                  </Link>{" "}
                  to generate a test key.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex h-7 items-center justify-between">
                <Label className="text-muted-foreground">Headers</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setHeaderRows((rows) => [...rows, { name: "", value: "" }])
                  }
                >
                  Add header
                </Button>
              </div>
              {headerRows.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Authorization is set from your key automatically.
                </p>
              ) : null}
              {headerRows.map((row, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={row.name}
                    onChange={(event) =>
                      setHeaderRows((rows) =>
                        rows.map((r, i) =>
                          i === index ? { ...r, name: event.target.value } : r,
                        ),
                      )
                    }
                    placeholder="X-Custom"
                    className="flex-1 font-mono text-xs"
                  />
                  <Input
                    value={row.value}
                    onChange={(event) =>
                      setHeaderRows((rows) =>
                        rows.map((r, i) =>
                          i === index ? { ...r, value: event.target.value } : r,
                        ),
                      )
                    }
                    placeholder="value"
                    className="flex-1 font-mono text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setHeaderRows((rows) =>
                        rows.filter((_, i) => i !== index),
                      )
                    }
                  >
                    <XIcon className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            {bodyMethods.has(method) ? (
              <div className="space-y-2">
                <div className="flex h-7 items-center">
                  <Label className="text-muted-foreground">Body</Label>
                </div>
                <Textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder='{"name": "test"}'
                  rows={8}
                  className="font-mono text-xs"
                />
              </div>
            ) : null}

            {history.length > 0 ? (
              <div className="space-y-2">
                <div className="flex h-7 items-center">
                  <Label className="text-muted-foreground">History</Label>
                </div>
                <div className="divide-y rounded-md border">
                  {history.map((entry, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => restore(entry)}
                      className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left font-mono text-xs hover:bg-accent"
                    >
                      <span className="w-14 shrink-0 text-muted-foreground">
                        {entry.method}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {entry.path}
                      </span>
                      <span className={statusTone(entry.status)}>
                        {entry.status}
                      </span>
                      <span className="w-14 shrink-0 text-right text-muted-foreground">
                        {entry.durationMs}ms
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="space-y-4 self-start lg:sticky lg:top-0 lg:pl-6">
            {burst ? <BurstStrip statuses={burst} /> : null}

            {response ? (
              <ResponsePane response={response} />
            ) : (
              <div className="flex min-h-48 items-center justify-center rounded-md border border-dashed">
                <div className="max-w-64 text-center">
                  <p className="text-sm font-medium">No response yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Requests go through the live gateway: auth, rate limits,
                    and quota all apply.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function BurstStrip({ statuses }: { statuses: number[] }) {
  const ok = statuses.filter((s) => s < 400).length;
  return (
    <div className="space-y-1.5 rounded-md border p-3">
      <div className="flex flex-wrap gap-1">
        {statuses.map((status, index) => (
          <span
            key={index}
            className={cn(
              "size-3 rounded-sm",
              status < 400
                ? "bg-emerald-500"
                : status === 429
                  ? "bg-destructive"
                  : "bg-amber-500",
            )}
            title={String(status)}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {ok} passed, {statuses.length - ok} limited
      </p>
    </div>
  );
}

function ResponsePane({ response }: { response: PlaygroundResponse }) {
  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3 font-mono text-sm">
        <span className={cn("font-medium", statusTone(response.status))}>
          {response.status} {response.statusText}
        </span>
        <span className="text-muted-foreground">{response.durationMs}ms</span>
        <span className="text-muted-foreground">
          {new Blob([response.body]).size} B
        </span>
      </div>

      <RateLimitStrip response={response} />

      <Tabs defaultValue="body">
        <TabsList>
          <TabsTrigger value="body">Body</TabsTrigger>
          <TabsTrigger value="headers">Headers</TabsTrigger>
        </TabsList>
        <TabsContent value="body">
          <pre className="max-h-96 overflow-auto rounded-md border bg-muted/30 p-3 font-mono text-xs">
            {prettyBody(response.body)}
            {response.truncated ? "\n… truncated" : ""}
          </pre>
        </TabsContent>
        <TabsContent value="headers">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {response.headers.map((header) => (
                <TableRow key={header.name}>
                  <TableCell className="font-mono text-xs">
                    {header.name}
                  </TableCell>
                  <TableCell className="break-all font-mono text-xs">
                    {header.value}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RateLimitStrip({ response }: { response: PlaygroundResponse }) {
  const limit = Number(findHeader(response, "x-ratelimit-limit"));
  const remaining = Number(findHeader(response, "x-ratelimit-remaining"));
  const reset = findHeader(response, "x-ratelimit-reset");
  const retryAfter = findHeader(response, "retry-after");

  if (!Number.isFinite(limit) || limit <= 0) {
    return null;
  }

  const limited = response.status === 429;
  const quotaHit = limited && response.body.includes("quota");

  return (
    <div
      className={cn(
        "space-y-1.5 rounded-md border p-3",
        limited ? "border-destructive/50" : null,
      )}
    >
      <div className="flex items-center justify-between text-xs">
        <span
          className={limited ? "text-destructive" : "text-muted-foreground"}
        >
          {quotaHit
            ? "Monthly quota exceeded"
            : limited
              ? `Rate limited, retry in ${retryAfter ?? "1"}s`
              : `${remaining} of ${limit} requests remaining`}
        </span>
        {reset ? (
          <span className="text-muted-foreground">resets in {reset}s</span>
        ) : null}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full",
            limited ? "bg-destructive" : "bg-emerald-500",
          )}
          style={{
            width: `${Math.max(0, Math.min(100, (remaining / limit) * 100))}%`,
          }}
        />
      </div>
    </div>
  );
}
