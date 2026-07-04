import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { plans, services } from "../../../db/schema/gateway";
import { getOrganizationId } from "../../../middleware/auth";
import { removePlan } from "../../../sync";
import type { AppRouteEnv } from "../../../types";
import { planIdParamSchema } from "./schemas";

export const deletePlan = new Hono<AppRouteEnv>().delete(
  "/:id",
  zValidator("param", planIdParamSchema),
  async (c) => {
    const organizationId = getOrganizationId(c);
    const { id } = c.req.valid("param");

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

    try {
      await c.get("db").delete(plans).where(eq(plans.id, id));
      await removePlan(id);
    } catch (error) {
      // FK restrict: api_keys still reference this plan
      if ((error as { code?: string }).code === "23503") {
        throw new HTTPException(409, {
          message: "Plan has API keys; revoke and delete them first",
        });
      }
      throw error;
    }
    return c.json({ id });
  },
);
