import { Hono } from "hono";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { createAuth } from "./auth";
import { checkDb, createDatabase } from "./db";
import { authMiddleware } from "./middleware/auth";
import { drainUsage } from "./lib/usage-drain";
import { consumersRoutes } from "./routes/protected/consumers";
import { keysRoutes } from "./routes/protected/keys";
import { logsRoutes } from "./routes/protected/logs";
import { plansRoutes } from "./routes/protected/plans";
import { organizationRoutes } from "./routes/protected/organization";
import { servicesRoutes } from "./routes/protected/services";
import { usageRoutes } from "./routes/protected/usage";
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

app.on(["POST", "GET"], "/api/auth/*", (c) =>
  createAuth(c.get("db")).handler(c.req.raw),
);

export const apiRoutes = app
  .basePath("/api")
  .get("/health", async (c) => c.json({ ok: await checkDb(c.get("db")) }))
  .route("/organization", organizationRoutes)
  .route("/services", servicesRoutes)
  .route("/plans", plansRoutes)
  .route("/consumers", consumersRoutes)
  .route("/keys", keysRoutes)
  .route("/usage", usageRoutes)
  .route("/logs", logsRoutes);

export type AppType = typeof apiRoutes;

// Workers runtime: the assets binding serves the SPA; cron replaces setInterval
export default {
  fetch: app.fetch,
  scheduled: async () => {
    const { db, close } = createDatabase();
    try {
      await drainUsage(db);
    } finally {
      await close();
    }
  },
};
