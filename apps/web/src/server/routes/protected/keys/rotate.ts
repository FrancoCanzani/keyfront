import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { apiKeys, consumers, services } from "../../../db/schema/gateway";
import { getOrganizationId } from "../../../middleware/auth";
import { generateKey, type KeyEnvironment } from "../../../lib/keys";
import { removeKey, syncKey } from "../../../lib/sync";
import type { AppRouteEnv } from "../../../types";
import { keyIdParamSchema } from "./schemas";

export const rotateKey = new Hono<AppRouteEnv>().post(
  "/:id/rotate",
  zValidator("param", keyIdParamSchema),
  async (c) => {
    const organizationId = getOrganizationId(c);
    const { id } = c.req.valid("param");
    const db = c.get("db");

    const [owned] = await db
      .select({
        id: apiKeys.id,
        keyHash: apiKeys.keyHash,
        status: apiKeys.status,
        consumerId: apiKeys.consumerId,
        planId: apiKeys.planId,
        expiresAt: apiKeys.expiresAt,
        name: apiKeys.name,
        environment: apiKeys.environment,
        meta: apiKeys.meta,
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
      throw new HTTPException(409, { message: "Only active keys can be rotated" });
    }

    const { rawKey, shortToken, prefix, keyHash } = generateKey(
      owned.environment as KeyEnvironment,
    );

    const row = await db.transaction(async (tx) => {
      await tx
        .update(apiKeys)
        .set({ status: "revoked" })
        .where(eq(apiKeys.id, id));
      const [inserted] = await tx
        .insert(apiKeys)
        .values({
          consumerId: owned.consumerId,
          planId: owned.planId,
          keyHash,
          prefix,
          shortToken,
          name: owned.name,
          environment: owned.environment,
          meta: owned.meta,
          rps: owned.rps,
          burst: owned.burst,
          ipAllowlist: owned.ipAllowlist,
          expiresAt: owned.expiresAt,
        })
        .returning({
          id: apiKeys.id,
          prefix: apiKeys.prefix,
          status: apiKeys.status,
          createdAt: apiKeys.createdAt,
        });
      return inserted;
    });

    await removeKey(owned.keyHash);
    await syncKey({
      keyHash,
      keyId: row.id,
      serviceId: owned.serviceId,
      planId: owned.planId,
      prefix,
      expiresAt: owned.expiresAt,
      environment: owned.environment,
      rps: owned.rps,
      burst: owned.burst,
      ipAllowlist: owned.ipAllowlist,
    });

    // same one-time shape as issuance
    return c.json({ ...row, key: rawKey }, 201);
  },
);
