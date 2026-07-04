import { zValidator } from "@hono/zod-validator";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { services } from "../../../db/schema/gateway";
import { getOrganizationId, getUser } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";
import { hostKeySchema, serviceIdParamSchema } from "./schemas";

export const getServices = new Hono<AppRouteEnv>()
  .get(
    "/availability",
    zValidator("query", z.object({ hostKey: z.string().min(1).max(64) })),
    async (c) => {
      getUser(c);
      const { hostKey } = c.req.valid("query");
      // advisory only — the unique constraint is what actually prevents collisions
      if (!hostKeySchema.safeParse(hostKey).success) {
        return c.json({ available: false });
      }
      const [row] = await c
        .get("db")
        .select({ id: services.id })
        .from(services)
        .where(eq(services.hostKey, hostKey));
      return c.json({ available: !row });
    },
  )
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
