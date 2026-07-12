import { zValidator } from "@hono/zod-validator";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { identity } from "../../../db/schema/identity";
import { key } from "../../../db/schema/key";
import { plan } from "../../../db/schema/plan";
import { getOrganizationId } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";

export const getAllKeys = new Hono<AppRouteEnv>().get(
  "/",
  zValidator("query", z.object({ serviceId: z.string().min(1) })),
  async (c) => {
    const organizationId = getOrganizationId(c);
    const db = c.get("db");
    const { serviceId } = c.req.valid("query");

    const rows = await db
      .select({
        id: key.id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        identityId: key.identityId,
        identityExternalId: identity.externalId,
        planId: key.planId,
        planName: plan.name,
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt,
        revokedAt: key.revokedAt,
      })
      .from(key)
      .leftJoin(identity, eq(key.identityId, identity.id))
      .innerJoin(plan, eq(key.planId, plan.id))
      .where(
        and(eq(key.organizationId, organizationId), eq(key.serviceId, serviceId)),
      )
      .orderBy(desc(key.createdAt));

    return c.json(rows);
  },
);
