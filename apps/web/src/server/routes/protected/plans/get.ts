import { zValidator } from "@hono/zod-validator";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { plans, services } from "../../../db/schema/gateway";
import { getOrganizationId } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";
import { listPlansQuerySchema } from "./schemas";

export const getPlans = new Hono<AppRouteEnv>().get(
  "/",
  zValidator("query", listPlansQuerySchema),
  async (c) => {
    const organizationId = getOrganizationId(c);
    const { serviceId } = c.req.valid("query");
    const rows = await c
      .get("db")
      .select({
        id: plans.id,
        serviceId: plans.serviceId,
        name: plans.name,
        rps: plans.rps,
        burst: plans.burst,
        monthlyQuota: plans.monthlyQuota,
        priceCents: plans.priceCents,
        createdAt: plans.createdAt,
      })
      .from(plans)
      .innerJoin(services, eq(plans.serviceId, services.id))
      .where(
        and(
          eq(plans.serviceId, serviceId),
          eq(services.organizationId, organizationId),
        ),
      )
      .orderBy(desc(plans.createdAt));
    return c.json(rows);
  },
);
