import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { apiKeys, consumers, plans, services } from "../../../db/schema/gateway";
import { getOrganizationId } from "../../../middleware/auth";
import { removeService } from "../../../sync";
import type { AppRouteEnv } from "../../../types";
import { serviceIdParamSchema } from "./schemas";

export const deleteService = new Hono<AppRouteEnv>().delete(
  "/:id",
  zValidator("param", serviceIdParamSchema),
  async (c) => {
    const organizationId = getOrganizationId(c);
    const { id } = c.req.valid("param");
    const db = c.get("db");

    // the cascade wipes plans/keys in PG; collect them first so redis follows
    const planRows = await db
      .select({ id: plans.id })
      .from(plans)
      .where(eq(plans.serviceId, id));
    const keyRows = await db
      .select({ keyHash: apiKeys.keyHash })
      .from(apiKeys)
      .innerJoin(consumers, eq(apiKeys.consumerId, consumers.id))
      .where(eq(consumers.serviceId, id));

    const [row] = await db
      .delete(services)
      .where(
        and(eq(services.id, id), eq(services.organizationId, organizationId)),
      )
      .returning({ id: services.id, hostKey: services.hostKey });
    if (!row) {
      throw new HTTPException(404, { message: "Service not found" });
    }

    await removeService({
      hostKey: row.hostKey,
      planIds: planRows.map((p) => p.id),
      keyHashes: keyRows.map((k) => k.keyHash),
    });
    return c.json({ id: row.id });
  },
);
