import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { apiOperations, apiSpecs } from "../../../db/schema/gateway";
import type { AppRouteEnv } from "../../../types";
import { specServiceParamSchema } from "./schemas";
import { requireService } from "./store";

export const deleteSpec = new Hono<AppRouteEnv>().delete(
  "/:serviceId",
  zValidator("param", specServiceParamSchema),
  async (c) => {
    const { serviceId } = c.req.valid("param");
    await requireService(c, serviceId);
    const db = c.get("db");
    await db.delete(apiOperations).where(eq(apiOperations.serviceId, serviceId));
    await db.delete(apiSpecs).where(eq(apiSpecs.serviceId, serviceId));
    return c.json({ ok: true });
  },
);
