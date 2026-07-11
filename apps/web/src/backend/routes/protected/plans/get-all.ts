import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { plan } from "../../../db/schema/plan";
import { getOrganizationId } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";

export const getAllPlans = new Hono<AppRouteEnv>().get("/", async (c) => {
  const organizationId = getOrganizationId(c);
  const db = c.get("db");

  const rows = await db
    .select()
    .from(plan)
    .where(eq(plan.organizationId, organizationId))
    .orderBy(desc(plan.createdAt));

  return c.json(rows);
});
