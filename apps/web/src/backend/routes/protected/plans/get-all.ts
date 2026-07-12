import { zValidator } from "@hono/zod-validator";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { plan } from "../../../db/schema/plan";
import { getOrganizationId } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";

export const getAllPlans = new Hono<AppRouteEnv>().get(
  "/",
  zValidator("query", z.object({ serviceId: z.string().min(1) })),
  async (c) => {
    const organizationId = getOrganizationId(c);
    const db = c.get("db");
    const { serviceId } = c.req.valid("query");

    const rows = await db
      .select()
      .from(plan)
      .where(
        and(eq(plan.organizationId, organizationId), eq(plan.serviceId, serviceId)),
      )
      .orderBy(desc(plan.createdAt));

    return c.json(rows);
  },
);
