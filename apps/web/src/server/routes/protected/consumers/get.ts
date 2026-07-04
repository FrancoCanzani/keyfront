import { zValidator } from "@hono/zod-validator";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { consumers, services } from "../../../db/schema/gateway";
import { getOrganizationId } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";
import { listConsumersQuerySchema } from "./schemas";

export const getConsumers = new Hono<AppRouteEnv>().get(
  "/",
  zValidator("query", listConsumersQuerySchema),
  async (c) => {
    const organizationId = getOrganizationId(c);
    const { serviceId } = c.req.valid("query");
    const rows = await c
      .get("db")
      .select({
        id: consumers.id,
        serviceId: consumers.serviceId,
        externalRef: consumers.externalRef,
        createdAt: consumers.createdAt,
      })
      .from(consumers)
      .innerJoin(services, eq(consumers.serviceId, services.id))
      .where(
        and(
          eq(consumers.serviceId, serviceId),
          eq(services.organizationId, organizationId),
        ),
      )
      .orderBy(desc(consumers.createdAt));
    return c.json(rows);
  },
);
