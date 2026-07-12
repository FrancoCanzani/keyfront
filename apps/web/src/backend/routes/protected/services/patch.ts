import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { service } from "../../../db/schema/service";
import { withRedis } from "../../../lib/redis";
import { syncRoute } from "../../../lib/sync";
import { getOrganizationId } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";
import { updateServiceSchema } from "./schemas";

export const patchService = new Hono<AppRouteEnv>().patch(
  "/:id",
  zValidator("json", updateServiceSchema),
  async (c) => {
    const organizationId = getOrganizationId(c);
    const db = c.get("db");
    const id = c.req.param("id");
    const updates = c.req.valid("json");

    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(service)
        .set(updates)
        .where(
          and(eq(service.id, id), eq(service.organizationId, organizationId)),
        )
        .returning();

      if (!row) {
        throw new HTTPException(404, { message: "Service not found" });
      }

      if (updates.upstream) {
        await withRedis((redis) =>
          syncRoute(redis, {
            serviceId: row.id,
            host: row.host,
            upstream: row.upstream,
            secret: row.gatewaySecret,
          }),
        );
      }

      return row;
    });

    return c.json({
      id: updated.id,
      organizationId: updated.organizationId,
      name: updated.name,
      host: updated.host,
      upstream: updated.upstream,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  },
);
