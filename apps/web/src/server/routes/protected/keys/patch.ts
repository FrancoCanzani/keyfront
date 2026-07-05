import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { apiKeys, consumers, services } from "../../../db/schema/gateway";
import { getOrganizationId } from "../../../middleware/auth";
import { removeKey, syncKey } from "../../../lib/sync";
import type { AppRouteEnv } from "../../../types";
import { keyIdParamSchema, updateKeySchema } from "./schemas";

export const revokeKey = new Hono<AppRouteEnv>().patch(
  "/:id/revoke",
  zValidator("param", keyIdParamSchema),
  async (c) => {
    const organizationId = getOrganizationId(c);
    const { id } = c.req.valid("param");
    const db = c.get("db");

    const [owned] = await db
      .select({ id: apiKeys.id, keyHash: apiKeys.keyHash })
      .from(apiKeys)
      .innerJoin(consumers, eq(apiKeys.consumerId, consumers.id))
      .innerJoin(services, eq(consumers.serviceId, services.id))
      .where(
        and(eq(apiKeys.id, id), eq(services.organizationId, organizationId)),
      );
    if (!owned) {
      throw new HTTPException(404, { message: "Key not found" });
    }

    const [row] = await db
      .update(apiKeys)
      .set({ status: "revoked" })
      .where(eq(apiKeys.id, id))
      .returning({
        id: apiKeys.id,
        prefix: apiKeys.prefix,
        status: apiKeys.status,
      });
    await removeKey(owned.keyHash);
    return c.json(row);
  },
);

export const updateKey = new Hono<AppRouteEnv>().patch(
  "/:id",
  zValidator("param", keyIdParamSchema),
  zValidator("json", updateKeySchema),
  async (c) => {
    const organizationId = getOrganizationId(c);
    const { id } = c.req.valid("param");
    const input = c.req.valid("json");
    const db = c.get("db");

    const [owned] = await db
      .select({
        id: apiKeys.id,
        keyHash: apiKeys.keyHash,
        status: apiKeys.status,
        planId: apiKeys.planId,
        prefix: apiKeys.prefix,
        expiresAt: apiKeys.expiresAt,
        environment: apiKeys.environment,
        rps: apiKeys.rps,
        burst: apiKeys.burst,
        ipAllowlist: apiKeys.ipAllowlist,
        serviceId: consumers.serviceId,
      })
      .from(apiKeys)
      .innerJoin(consumers, eq(apiKeys.consumerId, consumers.id))
      .innerJoin(services, eq(consumers.serviceId, services.id))
      .where(
        and(eq(apiKeys.id, id), eq(services.organizationId, organizationId)),
      );
    if (!owned) {
      throw new HTTPException(404, { message: "Key not found" });
    }
    if (owned.status !== "active") {
      throw new HTTPException(409, { message: "Key is revoked" });
    }

    const [row] = await db
      .update(apiKeys)
      .set({
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
      })
      .where(eq(apiKeys.id, id))
      .returning({
        id: apiKeys.id,
        prefix: apiKeys.prefix,
        name: apiKeys.name,
        enabled: apiKeys.enabled,
        status: apiKeys.status,
      });

    if (input.enabled === false) {
      await removeKey(owned.keyHash);
    }
    if (input.enabled === true) {
      await syncKey({
        keyHash: owned.keyHash,
        keyId: owned.id,
        serviceId: owned.serviceId,
        planId: owned.planId,
        prefix: owned.prefix,
        expiresAt: owned.expiresAt,
        environment: owned.environment,
        rps: owned.rps,
        burst: owned.burst,
        ipAllowlist: owned.ipAllowlist,
      });
    }
    return c.json(row);
  },
);
