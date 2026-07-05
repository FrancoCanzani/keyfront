export function gatewayUrlFor(hostKey: string) {
  const domain = process.env.GATEWAY_DOMAIN ?? "localhost:8080";
  const scheme = domain.includes("localhost") ? "http" : "https";
  return `${scheme}://${hostKey}.${domain}`;
}

export function docsUrl() {
  return process.env.DOCS_URL ?? "http://localhost:3000";
}
