import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { plan } from "../../../db/schema/plan";
import { getOrganizationId } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";

export const getPlan = new Hono<AppRouteEnv>().get("/:id", async (c) => {
  const organizationId = getOrganizationId(c);
  const db = c.get("db");
  const id = c.req.param("id");

  const [row] = await db
    .select()
    .from(plan)
    .where(and(eq(plan.id, id), eq(plan.organizationId, organizationId)));

  if (!row) {
    throw new HTTPException(404, { message: "Plan not found" });
  }

  return c.json(row);
});
