import { createHash, randomBytes } from "node:crypto";
import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { apiKeys, consumers, plans, services } from "../../../db/schema/gateway";
import { getOrganizationId } from "../../../middleware/auth";
import { syncKey } from "../../../sync";
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

    const rawKey = `gw_live_${randomBytes(24).toString("base64url")}`;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    const prefix = rawKey.slice(0, 12);

    const [row] = await db
      .insert(apiKeys)
      .values({ ...input, keyHash, prefix })
      .returning({
        id: apiKeys.id,
        prefix: apiKeys.prefix,
        status: apiKeys.status,
        createdAt: apiKeys.createdAt,
      });

    await syncKey({
      keyHash,
      keyId: row.id,
      serviceId: consumer.serviceId,
      planId: input.planId,
    });

    // the raw key is returned exactly once and never stored
    return c.json({ ...row, key: rawKey }, 201);
  },
);
