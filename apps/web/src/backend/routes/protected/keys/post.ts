import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { identity } from "../../../db/schema/identity";
import { key } from "../../../db/schema/key";
import { plan } from "../../../db/schema/plan";
import { service } from "../../../db/schema/service";
import { generateApiKey } from "../../../lib/keys";
import { withRedis } from "../../../lib/redis";
import { syncKey } from "../../../lib/sync";
import { getOrganizationId } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";
import { createKeySchema } from "./schemas";

export const postKey = new Hono<AppRouteEnv>().post(
  "/",
  zValidator("json", createKeySchema),
  async (c) => {
    const organizationId = getOrganizationId(c);
    const db = c.get("db");
    const { name, serviceId, identityId, planId, environment } =
      c.req.valid("json");

    const [ownedService] = await db
      .select({ id: service.id })
      .from(service)
      .where(
        and(eq(service.id, serviceId), eq(service.organizationId, organizationId)),
      );
    if (!ownedService) {
      throw new HTTPException(400, { message: "Unknown service" });
    }

    if (identityId) {
      const [ownedIdentity] = await db
        .select({ id: identity.id })
        .from(identity)
        .where(
          and(
            eq(identity.id, identityId),
            eq(identity.organizationId, organizationId),
          ),
        );
      if (!ownedIdentity) {
        throw new HTTPException(400, { message: "Unknown identity" });
      }
    }

    const [ownedPlan] = await db
      .select({ id: plan.id })
      .from(plan)
      .where(
        and(
          eq(plan.id, planId),
          eq(plan.organizationId, organizationId),
          eq(plan.serviceId, serviceId),
        ),
      );
    if (!ownedPlan) {
      throw new HTTPException(400, { message: "Unknown plan for this service" });
    }

    const generated = generateApiKey(environment);

    const created = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(key)
        .values({
          organizationId,
          identityId,
          serviceId,
          planId,
          name,
          keyHash: generated.hash,
          keyPrefix: generated.prefix,
        })
        .returning();

      if (!row) {
        throw new HTTPException(500, { message: "Failed to create key" });
      }

      await withRedis((redis) =>
        syncKey(redis, generated.hash, {
          id: row.id,
          organizationId,
          identityId,
          serviceId,
          planId,
          environment,
          status: "active",
        }),
      );

      return row;
    });

    return c.json(
      {
        key: {
          id: created.id,
          name: created.name,
          keyPrefix: created.keyPrefix,
          identityId: created.identityId,
          serviceId: created.serviceId,
          planId: created.planId,
          createdAt: created.createdAt,
        },
        plaintext: generated.plaintext,
      },
      201,
    );
  },
);
