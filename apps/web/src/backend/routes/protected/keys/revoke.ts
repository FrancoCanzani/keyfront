import { and, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { key } from "../../../db/schema/key";
import { withRedis } from "../../../lib/redis";
import { syncKey } from "../../../lib/sync";
import { getOrganizationId } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";

export const revokeKey = new Hono<AppRouteEnv>().delete("/:id", async (c) => {
  const organizationId = getOrganizationId(c);
  const db = c.get("db");
  const id = c.req.param("id");

  await db.transaction(async (tx) => {
    const [revoked] = await tx
      .update(key)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(key.id, id),
          eq(key.organizationId, organizationId),
          isNull(key.revokedAt),
        ),
      )
      .returning();

    if (!revoked) {
      throw new HTTPException(404, { message: "Key not found" });
    }

    await withRedis((redis) =>
      syncKey(redis, revoked.keyHash, {
        id: revoked.id,
        organizationId: revoked.organizationId,
        identityId: revoked.identityId,
        serviceId: revoked.serviceId,
        planId: revoked.planId,
        environment: revoked.keyPrefix.startsWith("kf_test_") ? "test" : "live",
        status: "revoked",
      }),
    );
  });

  return c.json({ ok: true });
});
