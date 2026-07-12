import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { createAuth } from "./auth";
import { checkDb } from "./db";
import { drainUsage } from "./lib/usage-drain";
import { authMiddleware } from "./middleware/auth";
import { identities } from "./routes/protected/identities";
import { keys } from "./routes/protected/keys";
import { plans } from "./routes/protected/plans";
import { playground } from "./routes/protected/playground";
import { services } from "./routes/protected/services";
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
  .route("/services", services)
  .route("/plans", plans)
  .route("/identities", identities)
  .route("/keys", keys)
  .route("/playground", playground);

export type AppType = typeof apiRoutes;

export default {
  fetch: app.fetch,
  scheduled(
    _controller: unknown,
    _env: unknown,
    ctx: { waitUntil(promise: Promise<unknown>): void },
  ) {
    ctx.waitUntil(
      drainUsage()
        .then((drained) => {
          if (drained > 0) {
            console.log(`usage drain: ${drained} counters`);
          }
        })
        .catch((error) => console.error("usage drain failed:", error)),
    );
  },
};
