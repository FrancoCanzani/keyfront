import { MAX_SPEC_BYTES, SpecError } from "./openapi";

const blockedHostPatterns = [
  /^localhost$/i,
  /\.local$/i,
  /\.internal$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^\[?::1\]?$/,
  /^\[?f[cd]/i,
  /^\[?fe80/i,
];

function assertPublicUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SpecError("Invalid spec URL");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new SpecError("Spec URL must be http(s)");
  }
  if (process.env.DEV_ALLOW_PRIVATE_URLS === "1") return url;
  if (blockedHostPatterns.some((pattern) => pattern.test(url.hostname))) {
    throw new SpecError("Spec URL resolves to a private address");
  }
  return url;
}

export async function fetchSpecUrl(raw: string): Promise<string> {
  let url = assertPublicUrl(raw);

  for (let hop = 0; hop < 4; hop++) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      headers: { accept: "application/json, application/yaml, text/yaml, */*" },
    }).catch(() => {
      throw new SpecError("Could not reach the spec URL");
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new SpecError("Redirect without location");
      url = assertPublicUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) {
      throw new SpecError(`Spec URL returned ${response.status}`);
    }

    const length = Number(response.headers.get("content-length") ?? 0);
    if (length > MAX_SPEC_BYTES) {
      throw new SpecError("Spec exceeds the 5 MB limit");
    }
    const text = await response.text();
    if (text.length > MAX_SPEC_BYTES) {
      throw new SpecError("Spec exceeds the 5 MB limit");
    }
    return text;
  }
  throw new SpecError("Too many redirects");
}
