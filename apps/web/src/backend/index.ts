import { Hono } from "hono";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { createAuth } from "./auth";
import { checkDb } from "./db";
import { authMiddleware } from "./middleware/auth";
import { plans } from "./routes/protected/plans";
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
  .route("/plans", plans);

export type AppType = typeof apiRoutes;

export default {
  fetch: app.fetch,
};
