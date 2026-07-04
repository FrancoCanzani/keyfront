import { Hono } from "hono";
import { logger } from "hono/logger";
import { serveStatic } from "hono/bun";
import { HTTPException } from "hono/http-exception";
import { auth } from "./auth";
import { checkDb } from "./db";
import { authMiddleware } from "./middleware/auth";
import { startUsageDrain } from "./usage-drain";
import { consumersRoutes } from "./routes/protected/consumers";
import { keysRoutes } from "./routes/protected/keys";
import { plansRoutes } from "./routes/protected/plans";
import { organizationRoutes } from "./routes/protected/organization";
import { servicesRoutes } from "./routes/protected/services";
import type { AppRouteEnv } from "./types";

const app = new Hono<AppRouteEnv>();

app.use("*", logger());
app.use("*", authMiddleware);

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return c.json({ error: error.message }, error.status);
  }
  console.error(error);
  return c.json({ error: "Internal Server Error" }, 500);
});

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

export const apiRoutes = app
  .basePath("/api")
  .get("/health", async (c) => c.json({ ok: await checkDb() }))
  .route("/organization", organizationRoutes)
  .route("/services", servicesRoutes)
  .route("/plans", plansRoutes)
  .route("/consumers", consumersRoutes)
  .route("/keys", keysRoutes);

export type AppType = typeof apiRoutes;

// Production: serve the built SPA. In dev, Vite serves it and proxies /api here.
app.use("/*", serveStatic({ root: "./dist" }));
app.get("/*", serveStatic({ path: "./dist/index.html" }));

startUsageDrain();

export default { port: Number(process.env.PORT ?? 8787), fetch: app.fetch };
