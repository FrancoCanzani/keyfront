import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { plan } from "../../../db/schema/plan";
import { service } from "../../../db/schema/service";
import { withRedis } from "../../../lib/redis";
import { syncPlan } from "../../../lib/sync";
import { getOrganizationId } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";
import { createPlanSchema } from "./schemas";

export const postPlan = new Hono<AppRouteEnv>().post(
  "/",
  zValidator("json", createPlanSchema),
  async (c) => {
    const organizationId = getOrganizationId(c);
    const db = c.get("db");
    const { serviceId, ...input } = c.req.valid("json");

    const [ownedService] = await db
      .select({ id: service.id })
      .from(service)
      .where(
        and(eq(service.id, serviceId), eq(service.organizationId, organizationId)),
      );
    if (!ownedService) {
      throw new HTTPException(400, { message: "Unknown service" });
    }

    const created = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(plan)
        .values({ organizationId, serviceId, ...input })
        .returning();

      if (!row) {
        throw new HTTPException(500, { message: "Failed to create plan" });
      }

      await withRedis((redis) =>
        syncPlan(redis, row.id, {
          rateLimit: row.rateLimit,
          burst: row.burst,
          monthlyQuota: row.monthlyQuota,
        }),
      );

      return row;
    });

    return c.json(created, 201);
  },
);
