import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { createAuth } from "./auth";
import { checkDb } from "./db";
import { authMiddleware } from "./middleware/auth";
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
  .get("/health", async (c) => c.json({ ok: await checkDb(c.get("db")) }));

export type AppType = typeof apiRoutes;

export default {
  fetch: app.fetch,
};
