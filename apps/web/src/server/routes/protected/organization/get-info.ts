import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { organization } from "../../../db/schema/auth";
import { getOrganizationId, getUser } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";

export const organizationInfoRoute = new Hono<AppRouteEnv>().get("/info", async (c) => {
  getUser(c);
  const orgId = getOrganizationId(c);
  const role = c.get("organizationRole");
  if (!role) {
    throw new HTTPException(403, { message: "Not a member of this organization" });
  }

  const [row] = await c
    .get("db")
    .select({ id: organization.id, name: organization.name })
    .from(organization)
    .where(eq(organization.id, orgId));

  if (!row) {
    throw new HTTPException(404, { message: "Organization not found" });
  }

  return c.json({ id: row.id, name: row.name, role });
});
