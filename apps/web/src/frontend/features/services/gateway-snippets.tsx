import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { gatewayDomain } from "@/lib/gateway-queries";

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

export function GatewaySnippets({ hostKey }: { hostKey: string }) {
  const [language, setLanguage] = useState<Language>("curl");
  const code = snippet(language, gatewayUrl(hostKey));

  return (
    <div className="grid max-w-2xl gap-2">
      <div className="flex items-center justify-between gap-2">
        <Tabs
          value={language}
          onValueChange={(value) => setLanguage(value as Language)}
        >
          <TabsList>
            {LANGUAGES.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button
          variant="outline"
          className="h-8 shrink-0"
          onClick={() => {
            navigator.clipboard.writeText(code);
            toast.success("Copied to clipboard");
          }}
        >
          Copy
        </Button>
      </div>
      <pre className="overflow-x-auto rounded-lg border bg-muted/40 px-3 py-2.5 font-mono text-xs leading-relaxed">
        {code}
      </pre>
    </div>
  );
}
