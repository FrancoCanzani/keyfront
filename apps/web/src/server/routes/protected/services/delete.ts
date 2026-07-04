import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { services } from "../../../db/schema/gateway";
import { getOrganizationId } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";
import { serviceIdParamSchema } from "./schemas";

export const deleteService = new Hono<AppRouteEnv>().delete(
  "/:id",
  zValidator("param", serviceIdParamSchema),
  async (c) => {
    const organizationId = getOrganizationId(c);
    const { id } = c.req.valid("param");
    const [row] = await c
      .get("db")
      .delete(services)
      .where(
        and(eq(services.id, id), eq(services.organizationId, organizationId)),
      )
      .returning({ id: services.id });
    if (!row) {
      throw new HTTPException(404, { message: "Service not found" });
    }
    return c.json({ id: row.id });
  },
);
