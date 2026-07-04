import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { plans, services } from "../../../db/schema/gateway";
import { getOrganizationId } from "../../../middleware/auth";
import { syncPlan } from "../../../sync";
import type { AppRouteEnv } from "../../../types";
import { createPlanSchema } from "./schemas";

export const createPlan = new Hono<AppRouteEnv>().post(
  "/",
  zValidator("json", createPlanSchema),
  async (c) => {
    const organizationId = getOrganizationId(c);
    const input = c.req.valid("json");

    const [service] = await c
      .get("db")
      .select({ id: services.id })
      .from(services)
      .where(
        and(
          eq(services.id, input.serviceId),
          eq(services.organizationId, organizationId),
        ),
      );
    if (!service) {
      throw new HTTPException(404, { message: "Service not found" });
    }

    const [row] = await c.get("db").insert(plans).values(input).returning();
    await syncPlan(row);
    return c.json(row, 201);
  },
);
