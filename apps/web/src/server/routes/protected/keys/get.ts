import { zValidator } from "@hono/zod-validator";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import {
  apiKeys,
  consumers,
  plans,
  services,
} from "../../../db/schema/gateway";
import { getOrganizationId } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";
import { listKeysQuerySchema } from "./schemas";

export const getKeys = new Hono<AppRouteEnv>().get(
  "/",
  zValidator("query", listKeysQuerySchema),
  async (c) => {
    const organizationId = getOrganizationId(c);
    const { serviceId } = c.req.valid("query");
    const rows = await c
      .get("db")
      .select({
        id: apiKeys.id,
        prefix: apiKeys.prefix,
        status: apiKeys.status,
        createdAt: apiKeys.createdAt,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
        consumerId: consumers.id,
        consumerExternalRef: consumers.externalRef,
        planId: plans.id,
        planName: plans.name,
      })
      .from(apiKeys)
      .innerJoin(consumers, eq(apiKeys.consumerId, consumers.id))
      .innerJoin(services, eq(consumers.serviceId, services.id))
      .innerJoin(plans, eq(apiKeys.planId, plans.id))
      .where(
        and(
          eq(consumers.serviceId, serviceId),
          eq(services.organizationId, organizationId),
        ),
      )
      .orderBy(desc(apiKeys.createdAt));
    return c.json(rows);
  },
);
