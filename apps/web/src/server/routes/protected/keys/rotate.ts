import { createHash, randomBytes } from "node:crypto";
import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { apiKeys, consumers, services } from "../../../db/schema/gateway";
import { getOrganizationId } from "../../../middleware/auth";
import { removeKey, syncKey } from "../../../sync";
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

    const rawKey = `gw_live_${randomBytes(24).toString("base64url")}`;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    const prefix = rawKey.slice(0, 12);

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
    });

    // same one-time shape as issuance
    return c.json({ ...row, key: rawKey }, 201);
  },
);
