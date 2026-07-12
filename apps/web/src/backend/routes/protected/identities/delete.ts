import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { identity } from "../../../db/schema/identity";
import { key } from "../../../db/schema/key";
import { withRedis } from "../../../lib/redis";
import { syncKey } from "../../../lib/sync";
import { getOrganizationId } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";

export const deleteIdentity = new Hono<AppRouteEnv>().delete(
  "/:id",
  async (c) => {
    const organizationId = getOrganizationId(c);
    const db = c.get("db");
    const id = c.req.param("id");

    await db.transaction(async (tx) => {
      const linked = await tx
        .select()
        .from(key)
        .where(
          and(eq(key.organizationId, organizationId), eq(key.identityId, id)),
        );

      const [deleted] = await tx
        .delete(identity)
        .where(
          and(eq(identity.id, id), eq(identity.organizationId, organizationId)),
        )
        .returning({ id: identity.id });

      if (!deleted) {
        throw new HTTPException(404, { message: "Identity not found" });
      }

      await withRedis((redis) =>
        Promise.all(
          linked.map((row) =>
            syncKey(redis, row.keyHash, {
              id: row.id,
              organizationId: row.organizationId,
              identityId: null,
              serviceId: row.serviceId,
              planId: row.planId,
              environment: row.keyPrefix.startsWith("kf_test_")
                ? "test"
                : "live",
              status: row.revokedAt ? "revoked" : "active",
            }),
          ),
        ),
      );
    });

    return c.json({ ok: true });
  },
);
