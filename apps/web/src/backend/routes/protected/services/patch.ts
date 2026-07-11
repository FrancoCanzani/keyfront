import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { plan } from "../../../db/schema/plan";
import { service } from "../../../db/schema/service";
import { withRedis } from "../../../lib/redis";
import { syncRoute } from "../../../lib/sync";
import { getOrganizationId } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";
import { updateServiceSchema } from "./schemas";

export const patchService = new Hono<AppRouteEnv>().patch(
  "/:id",
  zValidator("json", updateServiceSchema),
  async (c) => {
    const organizationId = getOrganizationId(c);
    const db = c.get("db");
    const id = c.req.param("id");
    const updates = c.req.valid("json");

    if (updates.defaultPlanId) {
      const [ownedPlan] = await db
        .select({ id: plan.id })
        .from(plan)
        .where(
          and(
            eq(plan.id, updates.defaultPlanId),
            eq(plan.organizationId, organizationId),
          ),
        );
      if (!ownedPlan) {
        throw new HTTPException(400, { message: "Unknown plan" });
      }
    }

    const [updated] = await db
      .update(service)
      .set(updates)
      .where(and(eq(service.id, id), eq(service.organizationId, organizationId)))
      .returning();

    if (!updated) {
      throw new HTTPException(404, { message: "Service not found" });
    }

    if (updates.upstream) {
      await withRedis((redis) =>
        syncRoute(redis, {
          host: updated.host,
          upstream: updated.upstream,
          secret: updated.gatewaySecret,
        }),
      );
    }

    return c.json({
      id: updated.id,
      organizationId: updated.organizationId,
      name: updated.name,
      host: updated.host,
      upstream: updated.upstream,
      defaultPlanId: updated.defaultPlanId,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  },
);
