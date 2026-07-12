import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { service } from "../../../db/schema/service";
import { getOrganizationId } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";
import { serviceColumns } from "../../../lib/columns";

export const getService = new Hono<AppRouteEnv>().get("/:id", async (c) => {
  const organizationId = getOrganizationId(c);
  const db = c.get("db");
  const id = c.req.param("id");

  const [row] = await db
    .select(serviceColumns)
    .from(service)
    .where(and(eq(service.id, id), eq(service.organizationId, organizationId)));

  if (!row) {
    throw new HTTPException(404, { message: "Service not found" });
  }

  return c.json(row);
});
