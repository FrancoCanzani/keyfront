import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { apiKeys, consumers, services } from "../../../db/schema/gateway";
import { getOrganizationId } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";
import { keyIdParamSchema } from "./schemas";

export const revokeKey = new Hono<AppRouteEnv>().patch(
  "/:id/revoke",
  zValidator("param", keyIdParamSchema),
  async (c) => {
    const organizationId = getOrganizationId(c);
    const { id } = c.req.valid("param");
    const db = c.get("db");

    const [owned] = await db
      .select({ id: apiKeys.id })
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
    return c.json(row);
  },
);
