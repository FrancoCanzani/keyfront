import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { plan } from "../../../db/schema/plan";
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
    const input = c.req.valid("json");

    const [created] = await db
      .insert(plan)
      .values({ organizationId, ...input })
      .returning();

    if (!created) {
      throw new HTTPException(500, { message: "Failed to create plan" });
    }

    await withRedis((redis) =>
      syncPlan(redis, created.id, {
        rateLimit: created.rateLimit,
        burst: created.burst,
        monthlyQuota: created.monthlyQuota,
      }),
    );

    return c.json(created, 201);
  },
);
