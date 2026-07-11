import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { service } from "../../../db/schema/service";
import { getOrganizationId } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";
import { serviceColumns } from "./columns";

export const getAllServices = new Hono<AppRouteEnv>().get("/", async (c) => {
  const organizationId = getOrganizationId(c);
  const db = c.get("db");

  const rows = await db
    .select(serviceColumns)
    .from(service)
    .where(eq(service.organizationId, organizationId))
    .orderBy(desc(service.createdAt));

  return c.json(rows);
});
