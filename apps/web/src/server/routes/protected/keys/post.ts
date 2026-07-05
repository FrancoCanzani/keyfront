import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { apiKeys, consumers, plans, services } from "../../../db/schema/gateway";
import { getOrganizationId } from "../../../middleware/auth";
import { generateKey } from "../../../lib/keys";
import { syncKey } from "../../../lib/sync";
import type { AppRouteEnv } from "../../../types";
import { createKeySchema } from "./schemas";

export const createKey = new Hono<AppRouteEnv>().post(
  "/",
  zValidator("json", createKeySchema),
  async (c) => {
    const organizationId = getOrganizationId(c);
    const input = c.req.valid("json");
    const db = c.get("db");

    // consumer and plan must belong to this org and to the same service
    const [consumer] = await db
      .select({ serviceId: consumers.serviceId })
      .from(consumers)
      .innerJoin(services, eq(consumers.serviceId, services.id))
      .where(
        and(
          eq(consumers.id, input.consumerId),
          eq(services.organizationId, organizationId),
        ),
      );
    if (!consumer) {
      throw new HTTPException(404, { message: "Consumer not found" });
    }
    const [plan] = await db
      .select({ id: plans.id })
      .from(plans)
      .where(
        and(eq(plans.id, input.planId), eq(plans.serviceId, consumer.serviceId)),
      );
    if (!plan) {
      throw new HTTPException(404, { message: "Plan not found on this service" });
    }

    const { rawKey, shortToken, prefix, keyHash } = generateKey(
      input.environment,
    );
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;

    const [row] = await db
      .insert(apiKeys)
      .values({
        consumerId: input.consumerId,
        planId: input.planId,
        keyHash,
        prefix,
        shortToken,
        name: input.name,
        environment: input.environment,
        expiresAt,
      })
      .returning({
        id: apiKeys.id,
        prefix: apiKeys.prefix,
        name: apiKeys.name,
        environment: apiKeys.environment,
        status: apiKeys.status,
        createdAt: apiKeys.createdAt,
        expiresAt: apiKeys.expiresAt,
      });

    await syncKey({
      keyHash,
      keyId: row.id,
      serviceId: consumer.serviceId,
      planId: input.planId,
      prefix,
      expiresAt,
      environment: input.environment,
      rps: null,
      burst: null,
      ipAllowlist: null,
    });

    // the raw key is returned exactly once and never stored
    return c.json({ ...row, key: rawKey }, 201);
  },
);
