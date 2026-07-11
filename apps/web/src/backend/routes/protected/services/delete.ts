import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { service } from "../../../db/schema/service";
import { withRedis } from "../../../lib/redis";
import { deleteRoute } from "../../../lib/sync";
import { getOrganizationId } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";

export const deleteService = new Hono<AppRouteEnv>().delete(
  "/:id",
  async (c) => {
    const organizationId = getOrganizationId(c);
    const db = c.get("db");
    const id = c.req.param("id");

    const [deleted] = await db
      .delete(service)
      .where(and(eq(service.id, id), eq(service.organizationId, organizationId)))
      .returning({ host: service.host });

    if (!deleted) {
      throw new HTTPException(404, { message: "Service not found" });
    }

    await withRedis((redis) => deleteRoute(redis, deleted.host));

    return c.json({ ok: true });
  },
);
