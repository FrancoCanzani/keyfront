import { type Context } from "hono";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { auth } from "../auth";
import { db } from "../db";
import type { AppRouteEnv } from "../types";

export const authMiddleware = createMiddleware<AppRouteEnv>(async (c, next) => {
  c.set("db", db);
  c.set("user", null);
  c.set("session", null);
  c.set("organizationId", null);

  if (new URL(c.req.raw.url).pathname.startsWith("/api/auth/")) {
    await next();
    return;
  }

  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (session?.user) {
    c.set("user", session.user);
    c.set("session", session.session);
    c.set("organizationId", session.session.activeOrganizationId ?? null);
  }

  await next();
});

export function getUser(c: Context<AppRouteEnv>) {
  const user = c.get("user");
  if (!user) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  return user;
}

export function getOrganizationId(c: Context<AppRouteEnv>) {
  getUser(c);
  const organizationId = c.get("organizationId");
  if (!organizationId) {
    throw new HTTPException(400, { message: "No active organization" });
  }
  return organizationId;
}
