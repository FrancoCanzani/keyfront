import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { plans, services } from "../../../db/schema/gateway";
import { getOrganizationId } from "../../../middleware/auth";
import { syncPlan } from "../../../lib/sync";
import type { AppRouteEnv } from "../../../types";
import { planIdParamSchema, updatePlanSchema } from "./schemas";

export const updatePlan = new Hono<AppRouteEnv>().patch(
  "/:id",
  zValidator("param", planIdParamSchema),
  zValidator("json", updatePlanSchema),
  async (c) => {
    const organizationId = getOrganizationId(c);
    const { id } = c.req.valid("param");
    const input = c.req.valid("json");

    const [owned] = await c
      .get("db")
      .select({ id: plans.id })
      .from(plans)
      .innerJoin(services, eq(plans.serviceId, services.id))
      .where(
        and(eq(plans.id, id), eq(services.organizationId, organizationId)),
      );
    if (!owned) {
      throw new HTTPException(404, { message: "Plan not found" });
    }

    const [row] = await c
      .get("db")
      .update(plans)
      .set(input)
      .where(eq(plans.id, id))
      .returning();
    await syncPlan(row);
    return c.json(row);
  },
);
