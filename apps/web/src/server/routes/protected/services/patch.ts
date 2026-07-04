import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { services } from "../../../db/schema/gateway";
import { getOrganizationId } from "../../../middleware/auth";
import { syncRoute } from "../../../lib/sync";
import type { AppRouteEnv } from "../../../types";
import { serviceIdParamSchema, updateServiceSchema } from "./schemas";

export const updateService = new Hono<AppRouteEnv>().patch(
  "/:id",
  zValidator("param", serviceIdParamSchema),
  zValidator("json", updateServiceSchema),
  async (c) => {
    const organizationId = getOrganizationId(c);
    const { id } = c.req.valid("param");
    const input = c.req.valid("json");
    const [row] = await c
      .get("db")
      .update(services)
      .set({ ...input, updatedAt: new Date() })
      .where(
        and(eq(services.id, id), eq(services.organizationId, organizationId)),
      )
      .returning();
    if (!row) {
      throw new HTTPException(404, { message: "Service not found" });
    }
    await syncRoute(row);
    return c.json(row);
  },
);
