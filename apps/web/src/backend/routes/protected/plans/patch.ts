import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { plan } from "../../../db/schema/plan";
import { withRedis } from "../../../lib/redis";
import { syncPlan } from "../../../lib/sync";
import { getOrganizationId } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";
import { updatePlanSchema } from "./schemas";

export const patchPlan = new Hono<AppRouteEnv>().patch(
  "/:id",
  zValidator("json", updatePlanSchema),
  async (c) => {
    const organizationId = getOrganizationId(c);
    const db = c.get("db");
    const id = c.req.param("id");
    const updates = c.req.valid("json");

    const [updated] = await db
      .update(plan)
      .set(updates)
      .where(and(eq(plan.id, id), eq(plan.organizationId, organizationId)))
      .returning();

    if (!updated) {
      throw new HTTPException(404, { message: "Plan not found" });
    }

    await withRedis((redis) =>
      syncPlan(redis, updated.id, {
        rateLimit: updated.rateLimit,
        burst: updated.burst,
        monthlyQuota: updated.monthlyQuota,
      }),
    );

    return c.json(updated);
  },
);
