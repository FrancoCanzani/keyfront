import { and, eq } from "drizzle-orm";
import { type Context } from "hono";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { auth } from "../auth";
import { member } from "../db/schema/auth";
import { db } from "../db";
import type { AppRouteEnv } from "../types";

export const authMiddleware = createMiddleware<AppRouteEnv>(async (c, next) => {
  c.set("db", db);
  c.set("user", null);
  c.set("session", null);
  c.set("organizationId", null);
  c.set("organizationRole", null);

  if (new URL(c.req.raw.url).pathname.startsWith("/api/auth/")) {
    await next();
    return;
  }

  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (session?.user) {
    c.set("user", session.user);
    c.set("session", session.session);

    const requestedId =
      c.req.header("x-organization-id") ??
      session.session.activeOrganizationId;
    if (requestedId) {
      const membership = await db.query.member.findFirst({
        where: and(
          eq(member.organizationId, requestedId),
          eq(member.userId, session.user.id),
        ),
      });
      if (membership) {
        c.set("organizationId", membership.organizationId);
        c.set("organizationRole", membership.role);
      }
    }
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
