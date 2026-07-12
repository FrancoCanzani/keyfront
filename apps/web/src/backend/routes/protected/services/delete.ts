import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { key } from "../../../db/schema/key";
import { plan } from "../../../db/schema/plan";
import { service } from "../../../db/schema/service";
import { withRedis } from "../../../lib/redis";
import { deleteKey, deletePlan, deleteRoute } from "../../../lib/sync";
import { getOrganizationId } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";

export const deleteService = new Hono<AppRouteEnv>().delete(
  "/:id",
  async (c) => {
    const organizationId = getOrganizationId(c);
    const db = c.get("db");
    const id = c.req.param("id");

    await db.transaction(async (tx) => {
      const [owned] = await tx
        .select({ id: service.id })
        .from(service)
        .where(
          and(eq(service.id, id), eq(service.organizationId, organizationId)),
        );

      if (!owned) {
        throw new HTTPException(404, { message: "Service not found" });
      }

      const keyRows = await tx
        .delete(key)
        .where(eq(key.serviceId, id))
        .returning({ keyHash: key.keyHash });

      const planRows = await tx
        .delete(plan)
        .where(eq(plan.serviceId, id))
        .returning({ id: plan.id });

      const [deleted] = await tx
        .delete(service)
        .where(eq(service.id, id))
        .returning({ host: service.host });

      if (!deleted) {
        throw new HTTPException(404, { message: "Service not found" });
      }

      await withRedis((redis) =>
        Promise.all([
          deleteRoute(redis, deleted.host),
          ...keyRows.map(({ keyHash }) => deleteKey(redis, keyHash)),
          ...planRows.map(({ id: planId }) => deletePlan(redis, planId)),
        ]),
      );
    });

    return c.json({ ok: true });
  },
);
