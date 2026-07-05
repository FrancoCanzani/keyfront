import { zValidator } from "@hono/zod-validator";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { apiKeys, consumers, plans, services } from "../../../db/schema/gateway";
import { generateKey } from "../../../lib/keys";
import { removeKey, syncKey } from "../../../lib/sync";
import { getOrganizationId } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";

const createTestKeySchema = z.object({
  serviceId: z.string().min(1),
});

const CONSOLE_CONSUMER = "console test";

export const createTestKey = new Hono<AppRouteEnv>().post(
  "/key",
  zValidator("json", createTestKeySchema),
  async (c) => {
    const organizationId = getOrganizationId(c);
    const { serviceId } = c.req.valid("json");
    const db = c.get("db");

    const [service] = await db
      .select({ id: services.id })
      .from(services)
      .where(
        and(
          eq(services.id, serviceId),
          eq(services.organizationId, organizationId),
        ),
      );
    if (!service) {
      throw new HTTPException(404, { message: "Service not found" });
    }

    const [plan] = await db
      .select({ id: plans.id })
      .from(plans)
      .where(eq(plans.serviceId, serviceId))
      .orderBy(desc(plans.createdAt))
      .limit(1);
    if (!plan) {
      throw new HTTPException(409, {
        message: "Create a plan before generating a testing key",
      });
    }

    await db
      .insert(consumers)
      .values({ serviceId, externalRef: CONSOLE_CONSUMER })
      .onConflictDoNothing();
    const [consumer] = await db
      .select({ id: consumers.id })
      .from(consumers)
      .where(
        and(
          eq(consumers.serviceId, serviceId),
          eq(consumers.externalRef, CONSOLE_CONSUMER),
        ),
      );
    if (!consumer) {
      throw new HTTPException(500, { message: "Could not create test consumer" });
    }

    const oldKeys = await db
      .delete(apiKeys)
      .where(eq(apiKeys.consumerId, consumer.id))
      .returning({ keyHash: apiKeys.keyHash });
    await Promise.all(oldKeys.map(({ keyHash }) => removeKey(keyHash)));

    const { rawKey, shortToken, prefix, keyHash } = generateKey("live");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const [key] = await db
      .insert(apiKeys)
      .values({
        consumerId: consumer.id,
        planId: plan.id,
        keyHash,
        prefix,
        shortToken,
        name: "Console testing key",
        environment: "test",
        expiresAt,
      })
      .returning({ id: apiKeys.id });

    await syncKey({
      keyHash,
      keyId: key.id,
      serviceId,
      planId: plan.id,
      prefix,
      expiresAt,
      environment: "test",
      rps: null,
      burst: null,
      ipAllowlist: null,
    });

    return c.json({ key: rawKey, expiresAt: expiresAt.toISOString() }, 201);
  },
);
