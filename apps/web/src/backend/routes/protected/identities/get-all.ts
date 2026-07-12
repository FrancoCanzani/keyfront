import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { identity } from "../../../db/schema/identity";
import { getOrganizationId } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";

export const getAllIdentities = new Hono<AppRouteEnv>().get("/", async (c) => {
  const organizationId = getOrganizationId(c);
  const db = c.get("db");

  const rows = await db
    .select()
    .from(identity)
    .where(eq(identity.organizationId, organizationId))
    .orderBy(desc(identity.createdAt));

  return c.json(rows);
});
