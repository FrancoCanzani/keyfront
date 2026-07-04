import { Hono } from "hono";

// Throwaway dev origin: echoes back whatever the gateway forwarded, so you
// can see stripped/injected headers
const app = new Hono();

app.all("*", async (c) => {
  c.header("X-Origin", "test-origin-9000");
  return c.json({
    message: "hello from origin :9000",
    method: c.req.method,
    path: c.req.path,
    headers: Object.fromEntries(c.req.raw.headers),
    body: await c.req.text(),
  });
});

console.log("echo origin listening on 127.0.0.1:9000");

export default { port: 9000, hostname: "127.0.0.1", fetch: app.fetch };
