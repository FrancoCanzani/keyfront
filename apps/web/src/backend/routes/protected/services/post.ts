import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { service } from "../../../db/schema/service";
import { serviceHost } from "../../../lib/hosts";
import { generateGatewaySecret } from "../../../lib/keys";
import { withRedis } from "../../../lib/redis";
import { syncRoute } from "../../../lib/sync";
import { getOrganizationId } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";
import { createServiceSchema } from "./schemas";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

export const postService = new Hono<AppRouteEnv>().post(
  "/",
  zValidator("json", createServiceSchema),
  async (c) => {
    const organizationId = getOrganizationId(c);
    const db = c.get("db");
    const { name, label, upstream } = c.req.valid("json");

    const host = serviceHost(label);
    const secret = generateGatewaySecret();

    let created;
    try {
      created = await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(service)
          .values({
            organizationId,
            name,
            host,
            upstream,
            gatewaySecret: secret,
          })
          .returning();

        if (!row) {
          throw new HTTPException(500, { message: "Failed to create service" });
        }

        await withRedis((redis) =>
          syncRoute(redis, { serviceId: row.id, host, upstream, secret }),
        );

        return row;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new HTTPException(409, { message: "That gateway host is taken" });
      }
      throw error;
    }

    return c.json(
      {
        service: {
          id: created.id,
          organizationId: created.organizationId,
          name: created.name,
          host: created.host,
          upstream: created.upstream,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        },
        secret,
      },
      201,
    );
  },
);
