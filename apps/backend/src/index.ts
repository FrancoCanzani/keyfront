import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { logger } from "hono/logger";
import { config } from "./config";
import { checkDb } from "./db";
import { checkRedis } from "./redis";

const app = new OpenAPIHono();
app.use(logger());

const healthSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  postgres: z.enum(["ok", "down"]),
  redis: z.enum(["ok", "down"]),
});

const healthRoute = createRoute({
  method: "get",
  path: "/health",
  responses: {
    200: { content: { "application/json": { schema: healthSchema } }, description: "Healthy" },
    503: { content: { "application/json": { schema: healthSchema } }, description: "Degraded" },
  },
});

app.openapi(healthRoute, async (c) => {
  const [pg, rd] = await Promise.all([checkDb(), checkRedis()]);
  const healthy = pg && rd;
  const body = {
    status: healthy ? "ok" : "degraded",
    postgres: pg ? "ok" : "down",
    redis: rd ? "ok" : "down",
  } as const;
  return c.json(body, healthy ? 200 : 503);
});

app.doc("/doc", { openapi: "3.1.0", info: { title: "api-gateway", version: "0.0.0" } });
app.get("/ui", swaggerUI({ url: "/doc" }));

export default { port: config.port, fetch: app.fetch };
