import { useState } from "react";
import { toast } from "sonner";
import { gatewayDomain } from "@/lib/gateway-queries";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { value: "curl", label: "curl" },
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
] as const;

type Language = (typeof LANGUAGES)[number]["value"];

export function gatewayUrl(hostKey: string) {
  const scheme = gatewayDomain.includes("localhost") ? "http" : "https";
  return `${scheme}://${hostKey}.${gatewayDomain}/`;
}

function snippet(language: Language, url: string) {
  switch (language) {
    case "curl":
      return `curl ${url} \\\n  -H "Authorization: Bearer $API_KEY"`;
    case "javascript":
      return [
        `const res = await fetch("${url}", {`,
        "  headers: { Authorization: `Bearer ${process.env.API_KEY}` },",
        "});",
        "console.log(res.status, await res.text());",
      ].join("\n");
    case "python":
      return [
        "import os",
        "",
        "import requests",
        "",
        "res = requests.get(",
        `    "${url}",`,
        '    headers={"Authorization": f"Bearer {os.environ[\'API_KEY\']}"},',
        ")",
        "print(res.status_code, res.text)",
      ].join("\n");
  }
}

const controlHeight =
  "h-7 min-h-7 box-border shrink-0 py-0 text-[11px] leading-7";

const pillClass = cn(
  "inline-flex items-center justify-center rounded border border-border bg-muted/40 px-2.5 font-normal transition-colors hover:bg-muted/60",
  controlHeight,
);

export function GatewaySnippets({ hostKey }: { hostKey: string }) {
  const [language, setLanguage] = useState<Language>("curl");
  const code = snippet(language, gatewayUrl(hostKey));

  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {LANGUAGES.map((item) => (
            <button
              key={item.value}
              type="button"
              className={cn(
                pillClass,
                language === item.value &&
                  "border-foreground/20 bg-muted/60 text-foreground",
              )}
              onClick={() => setLanguage(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={pillClass}
          onClick={() => {
            navigator.clipboard.writeText(code);
            toast.success("Copied to clipboard");
          }}
        >
          Copy
        </button>
      </div>
      <pre className="max-w-full overflow-x-auto rounded border border-border bg-muted/40 px-2.5 py-2 font-data text-[11px] leading-relaxed">
        {code}
      </pre>
    </div>
  );
}
