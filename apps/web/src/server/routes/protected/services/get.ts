import { zValidator } from "@hono/zod-validator";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { services } from "../../../db/schema/gateway";
import { getOrganizationId } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";
import { serviceIdParamSchema } from "./schemas";

export const getServices = new Hono<AppRouteEnv>()
  .get("/", async (c) => {
    const organizationId = getOrganizationId(c);
    const rows = await c
      .get("db")
      .select()
      .from(services)
      .where(eq(services.organizationId, organizationId))
      .orderBy(desc(services.createdAt));
    return c.json(rows);
  })
  .get("/:id", zValidator("param", serviceIdParamSchema), async (c) => {
    const organizationId = getOrganizationId(c);
    const { id } = c.req.valid("param");
    const [row] = await c
      .get("db")
      .select()
      .from(services)
      .where(
        and(eq(services.id, id), eq(services.organizationId, organizationId)),
      );
    if (!row) {
      throw new HTTPException(404, { message: "Service not found" });
    }
    return c.json(row);
  });
