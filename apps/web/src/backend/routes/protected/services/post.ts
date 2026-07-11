import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { plan } from "../../../db/schema/plan";
import { service } from "../../../db/schema/service";
import { generateGatewaySecret } from "../../../lib/keys";
import { withRedis } from "../../../lib/redis";
import { syncRoute } from "../../../lib/sync";
import { getOrganizationId } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";
import { createServiceSchema } from "./schemas";

const hostSuffix = process.env.GATEWAY_HOST_SUFFIX ?? "gw.keyfront.com";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

export const postService = new Hono<AppRouteEnv>().post(
  "/",
  zValidator("json", createServiceSchema),
  async (c) => {
    const organizationId = getOrganizationId(c);
    const db = c.get("db");
    const { name, label, upstream, defaultPlanId } = c.req.valid("json");

    if (defaultPlanId) {
      const [ownedPlan] = await db
        .select({ id: plan.id })
        .from(plan)
        .where(
          and(eq(plan.id, defaultPlanId), eq(plan.organizationId, organizationId)),
        );
      if (!ownedPlan) {
        throw new HTTPException(400, { message: "Unknown plan" });
      }
    }

    const host = `${label}.${hostSuffix}`;
    const secret = generateGatewaySecret();

    let created;
    try {
      [created] = await db
        .insert(service)
        .values({
          organizationId,
          name,
          host,
          upstream,
          gatewaySecret: secret,
          defaultPlanId: defaultPlanId ?? null,
        })
        .returning();
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new HTTPException(409, { message: "That gateway host is taken" });
      }
      throw error;
    }

    if (!created) {
      throw new HTTPException(500, { message: "Failed to create service" });
    }

    await withRedis((redis) => syncRoute(redis, { host, upstream, secret }));

    return c.json(
      {
        service: {
          id: created.id,
          organizationId: created.organizationId,
          name: created.name,
          host: created.host,
          upstream: created.upstream,
          defaultPlanId: created.defaultPlanId,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        },
        secret,
      },
      201,
    );
  },
);
